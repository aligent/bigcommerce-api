import { diffLines } from 'diff';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { GitError, simpleGit } from 'simple-git';
import { Project, SyntaxKind, Node as TsNode } from 'ts-morph';

const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));

const config = {
    version: packageJson.version,
    baseRef: 'HEAD~1',
    targetDir: 'src/internal/reference/generated',
    outputDir: `docs/changelog`,
};

/**
 * Summarize the changes to the interface definitions in the
 * `src/internal/reference/generated` directory between the current HEAD and the
 * previous commit.
 *
 * The script should be run from the root of the repo immediately after rebuilding the
 * generated files (this is handled by the `build:clean` script already).
 *
 * It will output a markdown file to `docs/changelog` with the following format:
 *
 * # Interface Change Summary: 1.0.1
 *
 * ## New files
 * ```diff
 * + tax_customers.v3.ts
 * ```
 *
 * ## Deleted files
 * ```diff
 * - carts.sf.ts
 * ```
 *
 * ## Modified files
 * ### `catalog/category_trees_catalog.v3.ts`
 *
 * components.schemas.CategoryNode:
 * ```diff
 * +             readonly url?: string;
 * ```
 *
 */
async function main() {
    console.log(
        `Comparing interface changes (pre-stripping JSDoc) between ${config.baseRef} and working tree in ${config.targetDir}...\n`
    );
    // Title for the markdown summary that will be written to disk.
    let summary = `# Interface Change Summary: ${config.version}\n\n`;

    // Create a simple-git instance to get information about the previous file state.
    const git = simpleGit();

    // Create the output directory if it doesn't exist already.
    if (!existsSync(config.outputDir)) {
        mkdirSync(config.outputDir, { recursive: true });
    }

    const outputFileName = `${config.outputDir}/${config.version}.md`;
    const { created, deleted, modified } = await getChangedTsFiles(git);

    // No interface changes this release (maybe it's a bugfix or refactor!)
    // Write an empty summary and exit.
    if (!modified.length && !created.length && !deleted.length) {
        summary += `No interface changes in ${config.targetDir}.\n`;
        console.log(`No interface changes in ${config.targetDir}.`);
        writeFileSync(outputFileName, summary);
        return;
    }

    if (created.length) {
        summary += `## New files\n`;
        summary += '```diff\n';
        summary += `+ ${created.map(removeTargetDirectoryPath).join('\n+ ')}\n`;
        summary += '```\n';
        console.log(
            `Found new files in ${config.targetDir}:\n  - ${created.map(removeTargetDirectoryPath).join('\n  - ')}\n`
        );
    }

    if (deleted.length) {
        summary += `## Deleted files\n`;
        summary += '```diff\n';
        summary += `- ${deleted.map(removeTargetDirectoryPath).join('\n- ')}\n`;
        summary += '```\n';
        console.log(`Found deleted files in ${config.targetDir}:\n  - ${deleted.join('\n  - ')}\n`);
    }

    if (modified.length) {
        summary += `## Modified files\n`;
        console.log(
            `Found modified files in ${config.targetDir}:\n  - ${modified.join('\n  - ')}\n`
        );

        // Initialise ts-morph projects for parsing changed content
        const projectOld = new Project({ useInMemoryFileSystem: true });
        const projectNew = new Project({ useInMemoryFileSystem: true });

        // For each file that has changed relative to the base git ref
        // Group changes by the path to the changed property and add
        // markdown diff blocks to the summary
        for (const filePath of modified) {
            summary += await summariseChangesToFile(filePath, git, projectOld, projectNew);
        }
    }

    // Write the complete summary to disk.
    writeFileSync(outputFileName, summary);
    console.log(`\nSummary written to ${outputFileName}`);
}

main().catch(error => {
    console.error('\nError generating interface change summary:', error);
    process.exit(1);
});

/**
 * Gets the typescript files that have changed (staged or unstaged)
 * compared to BASE_REF within the target directory using simple-git.
 *
 * @param {object} git - The simple-git instance.
 * @returns {Promise<string[]>} List of file paths relative to the repo root.
 */
async function getChangedTsFiles(git) {
    // Get a summary of changes to typescript files in the target directory
    // Exclude the exports directory as it should only contain barrel export files
    const statusSummary = await git.status([
        '--', // Ensure subsequent arguments are treated as paths
        `${config.targetDir}/*.ts`,
        `:(exclude)${config.targetDir}/exports/*`,
    ]);

    const { modified, created, deleted, not_added } = statusSummary;

    // New files are listed in not_added if they're unstaged, created if they're staged
    return {
        created: created.concat(not_added),
        deleted,
        modified,
    };
}

/**
 * Removes the target directory path from the file path.
 *
 * @param {string} filePath - The path to the file relative to the repo root.
 * @returns {string} The file path relative to the repo root.
 *
 * @example
 * ```typescript
 * removeTargetDirectoryPath('src/internal/reference/generated/channels.v3.ts') // 'channels.v3.ts'
 * ```
 */
function removeTargetDirectoryPath(filePath) {
    return filePath.replace(new RegExp(`^${config.targetDir}/`), '');
}

/**
 * Gets the content of a file at a specific Git reference.
 *
 * @param {object} git - The simple-git instance.
 * @param {string} gitRef - The git reference to check.
 * @param {string} filePath - Path relative to repo root
 * @returns {Promise<string>} The file content or an empty string if the file doesn't exist at that ref.
 */
async function getFileContentAtRef(git, gitRef, filePath) {
    return git.show(`${gitRef}:${filePath}`).catch(error => {
        // If the error is that the file didn't exist for the given ref, return an empty string.
        // This means the file is new and we're happy to continue as though it's an empty file.
        if (
            error instanceof GitError &&
            [
                `exists on disk, but not in '${gitRef}'`,
                `does not exist in '${gitRef}'`,
                `Path '${filePath}' does not exist in '${gitRef}'`,
            ].some(error.stderr.includes)
        ) {
            return '';
        }

        // Some other error, rethrow it.
        throw error;
    });
}

/**
 * Gets the content of a file in the working directory.
 *
 * @param {string} filePath - The path to the file relative to the repo root.
 * @returns {string} The file content or an empty string if the file doesn't exist.
 */
function getFileContentInWorkingDirectory(filePath) {
    const absoluteFilePath = resolve(filePath);
    if (!existsSync(absoluteFilePath)) {
        // Assume missing files have been deleted, treat as empty documents
        return '';
    }

    try {
        return readFileSync(absoluteFilePath, 'utf-8');
    } catch (readError) {
        console.error(`\nUnexpected error reading ${filePath} from disk.`);
        throw readError;
    }
}

/**
 * Prepares virtual source files for parsing.
 *
 * @param {object} git - The simple-git instance.
 * @param {string} filePath - The path to the file relative to the repo root.
 * @param {Project} projectOld - The ts-morph project instance for the old file.
 * @param {Project} projectNew - The ts-morph project instance for the new file.
 */
async function prepareSourceFiles(git, filePath, projectOld, projectNew) {
    // Old file content is read from the git ref.
    const rawOldContent = await getFileContentAtRef(git, config.baseRef, filePath);

    // New file content is read from the working directory.
    let rawNewContent = getFileContentInWorkingDirectory(filePath);

    // Initialise virtual source files for parsing
    const oldSource = projectOld.createSourceFile(`${filePath}.old.virtual.ts`, rawOldContent, {
        overwrite: true,
    });

    const newSource = projectNew.createSourceFile(`${filePath}.new.virtual.ts`, rawNewContent, {
        overwrite: true,
    });

    // Remove all JSDoc blocks from the source files.
    oldSource.getDescendantsOfKind(SyntaxKind.JSDoc).forEach(jsDoc => jsDoc.remove());
    newSource.getDescendantsOfKind(SyntaxKind.JSDoc).forEach(jsDoc => jsDoc.remove());

    return { oldSource, newSource };
}

/**
 * Gets the dot path to the first token in the source file at a given position.
 *
 * @param {Project} source - The ts-morph project instance.
 * @param {number} position - The position of the token in the source file.
 * @returns {string} The dot path to the token.
 */
function getDotPathToPosition(source, position) {
    const node = source.getDescendantAtPos(position);
    const namedParent = node?.getFirstAncestor(n => TsNode.hasName(n));
    return namedParent
        ?.getAncestors()
        .reverse()
        .map(n => (TsNode.hasName(n) ? n.getName() : ''))
        .filter(n => n !== '')
        .join('.');
}

/**
 * Summarises the changes to a file:
 * - The shortened filepath as a header
 * - A diff block for each group of changes prepended by the path to the property above that change
 *
 * @param {string} filePath - The path to the file relative to the repo root.
 * @param {object} git - The simple-git instance.
 * @param {Project} projectOld - The ts-morph project instance for the old file.
 * @param {Project} projectNew - The ts-morph project instance for the new file.
 * @returns {string} A string of markdown formatted changes.
 */
async function summariseChangesToFile(filePath, git, projectOld, projectNew) {
    console.log(`Summarising changes to ${filePath}...`);

    const { oldSource, newSource } = await prepareSourceFiles(
        git,
        filePath,
        projectOld,
        projectNew
    );

    const diff = diffLines(oldSource.getFullText(), newSource.getFullText(), {
        newlineIsToken: true,
        ignoreWhitespace: true,
    });

    let changeGroups = groupChangesByPropertyPath(diff, newSource, oldSource);

    if (!changeGroups.size) {
        console.log(`  - No interface changes found`);
        return '';
    }

    let fileSummary = `### \`${removeTargetDirectoryPath(filePath)}\`\n\n`;
    console.log(
        `  - Summarizing ${changeGroups.size} group${changeGroups.size === 1 ? '' : 's'} of changes`
    );

    // Add a diff block for each group of changes
    for (const [path, changes] of changeGroups.entries()) {
        fileSummary += changeGroupToDiffBlock(path, changes).join('\n') + '\n\n';
    }

    return fileSummary;
}

/**
 * Groups changes by the property path in the new source file. Also merges changes that
 * are separated by only one line (as that is typically just a newline or bracket token)
 *
 * @param {object[]} diff - The diff object.
 * @param {Project} newSource - The ts-morph project instance for the new file.
 * @param {Project} oldSource - The ts-morph project instance for the old file.
 * @returns {Map<string, object[]>} A map of property paths to their associated changes blocks.
 */
function groupChangesByPropertyPath(diff, newSource, oldSource) {
    let position = { added: 0, removed: 0 };
    let lineChanges = new Map();
    let path = '';

    // Small helper function for grouping changes in the map
    const recordChange = (path, change) => {
        if (!lineChanges.has(path)) {
            lineChanges.set(path, []);
        }
        lineChanges.get(path).push(change);
    };

    for (const change of diff) {
        // For additions and removals we work out the path to the first token,
        // then record the change under that path. The character position is used
        // to find the change in the Typescript source, and the position of additions/removals
        // correlates to the new/old typescript source respectively
        if (change.added) {
            path = getDotPathToPosition(newSource, position.added);
            recordChange(path, change);
            position.added += change.value.length;
            continue;
        }

        if (change.removed) {
            path = getDotPathToPosition(oldSource, position.removed);
            recordChange(path, change);
            position.removed += change.value.length;
            continue;
        }

        // If there's a single line that hasn't changed it's often just a newline
        // or bracket between two connected changes. Group it with the previous
        // change as this leads to clearer output
        if (change.value.split('\n').length === 1) {
            recordChange(path, change);
        }

        position.added += change.value.length;
        position.removed += change.value.length;
    }
    return lineChanges;
}

/**
 * Takes a group of changes at a property path and retuns an array
 * of lines for a markdown diff block.
 * @param {string} path - The dot path to the line change.
 * @param {object[]} changes - The change object.
 * @returns {string[]} The formatted line change.
 */
function changeGroupToDiffBlock(path, changes) {
    const terminatingNewLineRegex = /\n$/;
    const lines = changes
        .map(change =>
            change.value
                .replace(terminatingNewLineRegex, '')
                .split(`\n`)
                .map(line => {
                    const prefix = change.added ? '+' : change.removed ? '-' : ' ';
                    return `${prefix} ${line}`;
                })
                .join(`\n`)
        )
        .join(`\n`);
    return [`${path}:`, '```diff', lines, '```'];
}
