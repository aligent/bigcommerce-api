import { writeFileSync } from 'fs';
import { join } from 'node:path';

async function getRepoFiles(owner, repo, path) {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const files = [];

        // Process each item in the directory
        for (const item of data) {
            const itemPath = item.path.replace(`${path}/`, '');
            if (item.type === 'file') {
                files.push(itemPath);
            } else if (item.type === 'dir') {
                // Recursively get files from subdirectories
                const subFiles = await getRepoFiles(owner, repo, item.path);
                files.push(...subFiles.map(file => itemPath + '/' + file));
            }
        }

        return files;
    } catch (error) {
        console.error(`Error fetching repository contents for ${path}:`, error);
        return [];
    }
}

async function main() {
    const files = await getRepoFiles('bigcommerce', 'docs', 'reference');

    // Filter for YAML/YML files
    const yamlFiles = files.filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));

    // Write to files.json in the same directory
    const outputPath = join(import.meta.dirname, 'files.json');
    writeFileSync(outputPath, JSON.stringify(yamlFiles, null, 2));

    console.log(`Wrote ${yamlFiles.length} files to ${outputPath}`);
}

main().catch(console.error);
