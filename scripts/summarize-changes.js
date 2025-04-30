// TECH DEBT: This is a naive approach that uses regex to remove JSDocs and find parents properties.
// It can probably be improved by leaning more on ts-morph to parse the AST.
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { Project } from 'ts-morph';
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
 * Removes all JSDoc block comments  from source code.
 * @param {string} sourceCode The input source code.
 * @returns {string} Source code with JSDoc blocks removed.
 */
function stripAllJsDocs(sourceCode) {
    // Regex to find JSDoc blocks: starts with /**, ends with */, allows any characters including newlines in between (*?).
    // The 'g' flag ensures all occurrences are replaced.
    const jsDocRegex = /\/\*\*[\s\S]*?\*\/\s*/g;
    return sourceCode.replace(jsDocRegex, '');
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

    // First pass: identify actual changes and collect lines
    const changeParts = lineDiffs.filter(part => part.added || part.removed);
    if (!changeParts.length) {
         return { diffBlock: [], contextName: null };
    }

    outputLines.push('    ```diff');
    let changeBlockActive = false;

    lineDiffs.forEach(part => {
        const lines = part.value.split('\n');

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
 * Gets a list of TypeScript/TSX files that have changed (staged or unstaged)
 * compared to BASE_REF within the target directory.
 * @returns {string[]} List of file paths relative to the repo root.
 */
function getChangedTsFiles() {
    const statusCmd = `git status --porcelain=v1 --untracked-files=all -- "${config.targetDir}"`;

    let changedOrNewFiles = new Set();

     try {
        const statusOutput = execSync(statusCmd, { encoding: 'utf-8' });
        statusOutput.split('\n').filter(Boolean).forEach(line => {
            const status = line.substring(0, 2);
            const filePath = line.substring(3).trim();
            const cleanedPath = filePath.startsWith('"') && filePath.endsWith('"')
                ? filePath.substring(1, filePath.length - 1)
                : filePath;

            if ((cleanedPath.endsWith('.ts') || cleanedPath.endsWith('.tsx')) && cleanedPath.startsWith(config.targetDir)) {
                 changedOrNewFiles.add(cleanedPath);
            } else if (status.startsWith('R')) { // Handle renames R source -> dest
                const paths = cleanedPath.split(' -> ');
                const sourcePath = paths[0];
                const destPath = paths[1];
                 if (((sourcePath.endsWith('.ts') || sourcePath.endsWith('.tsx')) && sourcePath.startsWith(config.targetDir))) {
                    changedOrNewFiles.add(sourcePath);
                 }
                 if (((destPath.endsWith('.ts') || destPath.endsWith('.tsx')) && destPath.startsWith(config.targetDir))) {
                    changedOrNewFiles.add(destPath);
                 }
            }
        });
    } catch (e) {
        console.error(`Error running git status: ${e}`);
        return [];
    }
    return Array.from(changedOrNewFiles);
}


// --- Main Execution ---
async function main() {
    console.log(`Comparing interface changes (pre-stripping JSDoc) between ${config.baseRef} and working tree in ${config.targetDir}...`);
    let summary = `# Interface Change Summary: ${config.version}\n\n`;
    const projectOld = new Project({ useInMemoryFileSystem: true });
    const projectNew = new Project({ useInMemoryFileSystem: true });

    try {
        // Ensure output directory exists
        if (!existsSync(config.outputDir)) {
            mkdirSync(config.outputDir, { recursive: true });
        }

        const outputFileName = formatOutputFileName(config);
        const changedFiles = getChangedTsFiles();

        if (changedFiles.length === 0) {
            summary += `No interface changes in ${config.targetDir}.\n`;
            console.log(`No interface changes in ${config.targetDir}.`);
            writeFileSync(outputFileName, summary);
            return;
        }

        console.log(`Found changed/new files in ${config.targetDir}:\n${changedFiles.join('\n')}`);

        for (const filePath of changedFiles) {
            const absoluteFilePath = resolve(filePath);
            console.log(`Processing ${filePath}...`);

            // Pre-process old and new content to remove JSDocs
            const rawOldContent = getFileContentAtRef(config.baseRef, filePath);
            const oldContentStripped = stripAllJsDocs(rawOldContent);

            // New file content is read from the working directory.
            let rawNewContent = getFileContentInWorkingDirectory(absoluteFilePath, filePath);
            const newContentStripped = stripAllJsDocs(rawNewContent);


            // Parse and compare information about interfaces and their members in the changed content
            const oldInterfaces = extractInterfaces(projectOld, oldContentStripped, `${filePath}.old.virtual.ts`);
            const newInterfaces = extractInterfaces(projectNew, newContentStripped, `${filePath}.new.virtual.ts`);
            const fileChanges = compareInterfaces(oldInterfaces, newInterfaces);

            if (fileChanges.length > 0) {
                const displayPath = filePath.replace(new RegExp(`^${config.targetDir}/`), '');
                summary += `## \`${displayPath}\`\n\n`;
                summary += fileChanges.join('\n') + '\n\n';
            }
        }

        writeFileSync(outputFileName, summary);
        console.log(`Summary written to ${outputFileName}`);
    } catch (error) {
        console.error('Error generating interface change summary:', error);
        process.exit(1);
    }
}

main();