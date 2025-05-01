/**
 * This script is used to summarize the changes to the interface definitions in the
 * `src/internal/reference/generated` directory between the current HEAD and the
 * previous commit.
 *
 * It should be run from the root of the repo immediately after rebuilding the
 * generated files - this is handled by the `build:clean` script already.
 *
 * It will output a markdown file to `docs/changelog` with the following format:
 *
 * # Interface Change Summary: 1.0.0
 *
 * ## src/internal/reference/generated/channels.v3.ts
 *
 * - **Added Interface:** \`ChannelNode\`
 * - **Removed Interface:** \`ChannelNode\`
 *
 */
// TECH DEBT: This is a naive approach that uses regex to remove JSDocs and find parents properties.
// It can probably be improved by leaning more on ts-morph to parse the AST.
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { Project, SyntaxKind } from 'ts-morph';
import * as Diff from 'diff';

const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));

const config = {
    version: packageJson.version,
    baseRef: 'HEAD~1',
    targetDir: 'src/internal/reference/generated',
    outputDir: `docs/changelog`
}

function formatOutputFileName(config) {
    return `${config.outputDir}/${config.version}.md`;
}

/**
 * Gets the content of a file at a specific Git reference.
 * @param {string} gitRef
 * @param {string} filePath - Path relative to repo root
 * @returns {string} The file content or an empty string if the file doesn't exist at that ref.
 */
function getFileContentAtRef(gitRef, filePath) {
    try {
        const contentBuffer = execSync(`git show ${gitRef}:${filePath}`, { encoding: 'buffer', stdio: 'pipe' });
        return contentBuffer.toString('utf-8');
    } catch (error) {
        // Handle case where file didn't exist at that ref (e.g., new file)
        // Check stderr for common "does not exist" messages
        const stderr = error.stderr ? error.stderr.toString() : '';
        if (stderr.includes('exists on disk, but not in') || stderr.includes('does not exist')) {
            return '';
        }
        console.warn(`Warning: Could not get content of ${filePath} at ${gitRef}. Error: ${error} Stderr: ${stderr}`);
        return '';
    }
}

/**
 * Gets the content of a file in the working directory.
 * @param {string} absoluteFilePath - The absolute path to the file.
 * @param {string} filePath - The path to the file relative to the repo root.
 * @returns {string} The file content or an empty string if the file doesn't exist.
 */
function getFileContentInWorkingDirectory(absoluteFilePath, filePath) {
    if (existsSync(absoluteFilePath)) {
        try {
            return readFileSync(absoluteFilePath, 'utf-8');
        } catch (readError) {
            console.warn(`Warning: Could not read file ${filePath} from disk. Error: ${readError}`);
        }
    } else {
        console.log(`File ${filePath} does not exist in working directory (likely deleted or renamed away).`);
    }
    return '';
}

/**
 * Extracts exported interface details from TypeScript source code.
 * Assumes JSDoc has already been stripped from the input sourceCode.
 * @param {Project} project - The ts-morph project instance.
 * @param {string} sourceCode - The TypeScript source code content (JSDoc removed).
 * @param {string} virtualFilePath - A unique virtual path for ts-morph.
 * @returns {Map<string, {name: string, members: Map<string, {name: string, signature: string}>}>}
 */
function extractInterfaces(project, sourceCode, virtualFilePath) {
    const interfaces = new Map();

    // If there is no source code (e.g., the file was deleted), return an empty map.
    if (!sourceCode) {
        return interfaces;
    }

    const sourceFile = project.createSourceFile(virtualFilePath, sourceCode, {
        overwrite: true,
    });

    // Remove all JSDoc blocks from the source file.
    sourceFile.getDescendantsOfKind(SyntaxKind.JSDoc).forEach(jsDoc => jsDoc.remove());

    sourceFile.getInterfaces().forEach(interfaceDeclaration => {
        // Only extract exported interfaces as they represent the public API
        if (interfaceDeclaration.isExported()) {
            const interfaceName = interfaceDeclaration.getName();
            const membersMap = new Map();
            interfaceDeclaration.getMembers().forEach(member => {
                const memberName = member.getName();
                 // Get text directly from the node in the JSDoc-stripped AST
                const signature = member.getText().trim();

                if (memberName && signature) {
                    membersMap.set(memberName, { name: memberName, signature: signature });
                }
            });
            interfaces.set(interfaceName, { name: interfaceName, members: membersMap });
        }
    });

    return interfaces;
}

/**
 * Formats the diff output for markdown and tries to infer the nested context name.
 * @param {Diff.Change[]} lineDiffs - Array of change objects from diffLines.
 * @returns {{diffBlock: string[], contextName: string | null}} - Formatted diff lines and the inferred context name (e.g., 'CategoryNode').
 */
function formatLineDiffAndInferContext(lineDiffs) {
    const outputLines = [];
    let lastPotentialContextName = null;
    let contextNameForChange = null;
    let hasVisibleChanges = false;
    // Regex to capture a potential property name before an opening brace, possibly readonly.
    // Captures the identifier (\w+). Increased robustness for whitespace.
    const contextNameRegex = /^\s*(?:readonly\s+)?(\w+)\s*:\s*\{/;

    // Check if we have any actual changes to report, return early if not
    const changeParts = lineDiffs.filter(part => part.added || part.removed);
    if (!changeParts.length) {
         return { diffBlock: [], contextName: null };
    }

    // Start writing the diff block - e.g.
    // ```diff
    // - ...
    // + ...
    // ```
    outputLines.push('    ```diff');
    let changeBlockActive = false;

    lineDiffs.forEach(part => {
        const lines = part.value.split('\n');

        // The logic here is a bit complex - the purpose is to find the 'context' for a change,
        // which is usually the name of the interface or property that the changed member belongs to.
        if (!part.added && !part.removed) {
             // Look for context in lines preceding a change block
            lines.forEach(line => {
                const match = line.match(contextNameRegex);
                if (match && !changeBlockActive) { // Only update context if we are not inside a change block
                    lastPotentialContextName = match[1];
                }
            });
            changeBlockActive = false; // Reset flag when entering context block
        } else {
            // This part has additions or removals
            hasVisibleChanges = true;
            changeBlockActive = true; // Set flag when inside a change block
            if (contextNameForChange === null && lastPotentialContextName !== null) {
                 // Capture the last known context name *before* the first change line
                 contextNameForChange = lastPotentialContextName;
            }

            const prefix = part.added ? '+ ' : '- ';
            lines.forEach((line, idx) => {
                 // Avoid adding trailing newline as a separate diff line if it exists
                if (idx === lines.length - 1 && line === '') return;
                 outputLines.push(`    ${prefix}${line}`);
            });
        }
    });

    // Close the diff block
    outputLines.push('    ```');

    // Ensure we only return a diff block if there were actual visible changes
    return {
         diffBlock: hasVisibleChanges ? outputLines : [],
         contextName: contextNameForChange // Return the context identified before the first +/- line
     };
}

/**
 * Compares two sets of interface definitions and returns a summary string array.
 * Operates on signatures assumed to be JSDoc-free due to pre-processing.
 * @param {Map<string, {name: string, members: Map<string, {name: string, signature: string}>}>} oldInterfaces
 * @param {Map<string, {name: string, members: Map<string, {name: string, signature: string}>}>} newInterfaces
 * @returns {string[]}
 */
function compareInterfaces(oldInterfaces, newInterfaces) {
    const changes = [];
    const allNames = new Set([...oldInterfaces.keys(), ...newInterfaces.keys()]);

    for (const name of allNames) {
        const oldI = oldInterfaces.get(name);
        const newI = newInterfaces.get(name);

        // In the unlikely event that an entire interface was added or removed,
        // Handle it here.
        if (!oldI) {
                 changes.push(`- **Added Interface:** \`${name}\``);
            continue;
            }

        if (!newI) {
                changes.push(`- **Removed Interface:** \`${name}\``);
            continue;
             }

        if (oldI && newI) {
            const memberChanges = [];
            const allMemberNames = new Set([...oldI.members.keys(), ...newI.members.keys()]);

            for (const memberName of allMemberNames) {
                const oldM = oldI.members.get(memberName);
                const newM = newI.members.get(memberName);

                 if (!oldM && newM) {
                    memberChanges.push(`  - Added member \`${newM.signature}\``);
                } else if (oldM && !newM) {
                    memberChanges.push(`  - Removed member \`${oldM.name}\``);
                }
                // Compare JSDoc-free signatures
                else if (oldM && newM && oldM.signature !== newM.signature) {
                    const lineDiffs = Diff.diffLines(oldM.signature, newM.signature, {
                        newlineIsToken: true,
                        ignoreWhitespace: true, // Ignore whitespace-only changes
                    });

                     // Get formatted diff and inferred context
                     const { diffBlock, contextName } = formatLineDiffAndInferContext(lineDiffs);

                    // Only report if there are actual diff lines to show
                    if (diffBlock.length > 0) {
                        // Construct label with context if found
                         const label = `  - Modified member \`${memberName}${contextName ? '.' + contextName : ''}\`:`;
                         memberChanges.push(label);
                         memberChanges.push(...diffBlock);
                    }
                }
            }

            if (memberChanges.length > 0) {
                changes.push(`- **Modified Interface:** \`${name}\``);
                changes.push(...memberChanges);
            }
        }
    }
    return changes;
}

/**
 * Gets the typescript files that have changed (staged or unstaged)
 * compared to BASE_REF within the target directory.
 * @returns {string[]} List of file paths relative to the repo root.
 */
function getChangedTsFiles() {
    // Use porcelain v1 format for simple machine readable output
    const statusCmd = `git status --porcelain=v1 --untracked-files=all -- "${config.targetDir}"`;

    let changedOrNewFiles = new Set();

        const statusOutput = execSync(statusCmd, { encoding: 'utf-8' });

    // Parse each line of the git output
    // e.g.  M src/internal/reference/generated/channels.v3.ts
    // Assumptions:
    // - generated files will not have spaces or any special characters in their name
    // - generation process will produce typescript files
    // - generation process will completely remove and rebuild the files, so we don't have to handle renames
    // This logic needs to be more complex if these assumptions are not true in the future
        statusOutput.split('\n').filter(Boolean).forEach(line => {
            const filePath = line.substring(3).trim();

        // Only consider files located in the target directory
        if (filePath.startsWith(config.targetDir)) {
                changedOrNewFiles.add(filePath);
            }
        });

    return Array.from(changedOrNewFiles);
}

async function main() {
    console.log(`Comparing interface changes (pre-stripping JSDoc) between ${config.baseRef} and working tree in ${config.targetDir}...`);
    // Set up the markdown summary that will be written to disk.
    let summary = `# Interface Change Summary: ${config.version}\n\n`;

    try {
        // Create the output directory if it doesn't exist already.
        if (!existsSync(config.outputDir)) {
            mkdirSync(config.outputDir, { recursive: true });
        }

        const outputFileName = formatOutputFileName(config);
        const changedFiles = getChangedTsFiles();

        // No interface changes this release (maybe it's a bugfix or refactor!)
        // Write an empty summary and exit.
        if (!changedFiles.length) {
            summary += `No interface changes in ${config.targetDir}.\n`;
            console.log(`No interface changes in ${config.targetDir}.`);
            writeFileSync(outputFileName, summary);
            return;
        }

        console.log(`Found changed/new files in ${config.targetDir}:\n${changedFiles.join('\n')}`);

        // Initialise ts-morph projects for parsing changed content
        const projectOld = new Project({ useInMemoryFileSystem: true });
        const projectNew = new Project({ useInMemoryFileSystem: true });

        // For each file that has changed relative to the base git ref:
        // - Read the old and new content, preprocess to remove JSDoc
        // - Parse the old and new content into TypeScript interface information
        // - Compare the interfaces and generate a summary of changed interfaces and members
        for (const filePath of changedFiles) {
            const absoluteFilePath = resolve(filePath);
            console.log(`Processing ${filePath}...`);

            // Old file content is read from the git ref.
            const rawOldContent = getFileContentAtRef(config.baseRef, filePath);
            // New file content is read from the working directory.
            let rawNewContent = getFileContentInWorkingDirectory(absoluteFilePath, filePath);

            // Parse and compare information about interfaces and their members in the changed content
            const oldInterfaces = extractInterfaces(projectOld, rawOldContent, `${filePath}.old.virtual.ts`);
            const newInterfaces = extractInterfaces(projectNew, rawNewContent, `${filePath}.new.virtual.ts`);
            const fileChanges = compareInterfaces(oldInterfaces, newInterfaces);

            if (fileChanges.length) {
                // Remove unnecessary prefixes from the file path for readability
                // e.g. src/internal/reference/generated/channels.v3.ts --> channels.v3.ts
                const displayPath = filePath.replace(new RegExp(`^${config.targetDir}/`), '');

                // Add an entry for this file to the summary.
                summary += `## \`${displayPath}\`\n\n`;
                summary += fileChanges.join('\n') + '\n\n';
            }
        }

        // Write the complete summary to disk.
        writeFileSync(outputFileName, summary);
        console.log(`Summary written to ${outputFileName}`);
    } catch (error) {
        console.error('Error generating interface change summary:', error);
        process.exit(1);
    }
}

main();