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
 * # Interface Change Summary: 1.0.0
 *
 * ## `customers.v3.ts`
 *
 * operations.getMetafieldsCustomerId.responses:
 * ```diff
 * -             readonly 200: components["responses"]["MetafieldCollectionResponse"];
 * +             readonly 200: {
 * ```
 *
 */
async function main() {
    console.log(
        `Comparing interface changes (pre-stripping JSDoc) between ${config.baseRef} and working tree in ${config.targetDir}...\n`
    );
    // Title for the markdown summary that will be written to disk.
    let summary = `# Interface Change Summary: ${config.version}\n\n`;

    try {
        // Create a simple-git instance to get information about the previous file state.
        const git = simpleGit();

        // Create the output directory if it doesn't exist already.
        if (!existsSync(config.outputDir)) {
            mkdirSync(config.outputDir, { recursive: true });
        }

        const outputFileName = `${config.outputDir}/${config.version}.md`;
        const changedFiles = await getChangedTsFiles(git);

        // No interface changes this release (maybe it's a bugfix or refactor!)
        // Write an empty summary and exit.
        if (!changedFiles.length) {
            summary += `No interface changes in ${config.targetDir}.\n`;
            console.log(`No interface changes in ${config.targetDir}.`);
            writeFileSync(outputFileName, summary);
            return;
        }

        console.log(
            `Found changed/new files in ${config.targetDir}:\n  - ${changedFiles.join('\n  - ')}\n`
        );

        // Initialise ts-morph projects for parsing changed content
        const projectOld = new Project({ useInMemoryFileSystem: true });
        const projectNew = new Project({ useInMemoryFileSystem: true });

        // For each file that has changed relative to the base git ref
        // Group changes by the path to the changed property and add
        // markdown diff blocks to the summary
        for (const filePath of changedFiles) {
            console.log(`Processing ${filePath}...`);

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

            if (changeGroups.size) {
                console.log(
                    `  - Summarizing ${changeGroups.size} group${changeGroups.size === 1 ? '' : 's'} of changes`
                );

                // Remove unnecessary prefixes from the file path for readability
                // e.g. src/internal/reference/generated/channels.v3.ts --> channels.v3.ts
                const displayPath = filePath.replace(new RegExp(`^${config.targetDir}/`), '');

                // Add an entry for this file to the summary.
                summary += `## \`${displayPath}\`\n\n`;
                for (const [path, changes] of changeGroups.entries()) {
                    summary += changeGroupToDiffBlock(path, changes).join('\n') + '\n\n';
                }
            } else {
                console.log(`  - No interface changes found`);
            }
        }

        // Write the complete summary to disk.
        writeFileSync(outputFileName, summary);
        console.log(`\nSummary written to ${outputFileName}`);
    } catch (error) {
        console.error('\nError generating interface change summary:', error);
        process.exit(1);
    }
}

main();

/**
 * Gets the typescript files that have changed (staged or unstaged)
 * compared to BASE_REF within the target directory using simple-git.
 * @param {object} git - The simple-git instance.
 * @returns {Promise<string[]>} List of file paths relative to the repo root.
 */
async function getChangedTsFiles(git) {
    // Use simple-git status method with options
    const statusSummary = await git.status([
        '--porcelain=v1',
        '--untracked-files=all',
        '--', // Ensure subsequent arguments are treated as paths
        config.targetDir,
    ]);

    const changedOrNewFiles = new Set();

    // Regex to extract file paths starting with target directory and ending with .ts
    const pathRegex = new RegExp(`${config.targetDir}.*.ts`);
    for (const file of statusSummary.files) {
        // Extract the file path part, removing the status flags and whitespace
        // Example: ' M src/a.ts' -> 'src/a.ts'
        // Example: '?? src/b.ts' -> 'src/b.ts'
        const filePath = file.path.match(pathRegex)[0];

        // Filter based on target directory and ensure it's a TS file (optional, but good practice)
        if (filePath) {
            changedOrNewFiles.add(filePath);
        }
    }

    return Array.from(changedOrNewFiles);
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
 * @param {string} filePath - The path to the file relative to the repo root.
 * @returns {string} The file content or an empty string if the file doesn't exist.
 */
function getFileContentInWorkingDirectory(filePath) {
    const absoluteFilePath = resolve(filePath);
    if (existsSync(absoluteFilePath)) {
        try {
            return readFileSync(absoluteFilePath, 'utf-8');
        } catch (readError) {
            console.warn(`Warning: Could not read file ${filePath} from disk. Error: ${readError}`);
        }
    } else {
        console.log(
            `File ${filePath} does not exist in working directory (likely deleted or renamed away).`
        );
    }

    // Assume missing files have been deleted, treat as empty documents
    return '';
}

/**
 * Prepares virtual source files for parsing.
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
