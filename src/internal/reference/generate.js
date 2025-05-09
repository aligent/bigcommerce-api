import { mkdir, rename, rm, writeFile } from 'fs/promises';
import { basename, dirname, join } from 'node:path';
import openapiTS, { astToString } from 'openapi-typescript';
import { Project } from 'ts-morph';
import { v4 as uuid } from 'uuid';
import packageJson from '../../../package.json' with { type: 'json' };
import { FILE_BANNER, processApiSource } from './ast-utilities.js';
import blacklistConfig from './blacklist.json' with { type: 'json' };
import filesConfig from './files.json' with { type: 'json' };
import { cwd } from 'process';

const __dirname = import.meta.dirname;

/**
 * @typedef {Object} ModuleInfo
 * @property {string} moduleName - The name of the module
 * @property {string|null} groupName - The group name (v2, v3, sf, etc.)
 * @property {string} dirPath - The directory path
 * @property {string} yamlFilename - The original YAML filename
 * @property {string} tsFilename - The output TypeScript filename
 * @property {string} exportName - The export name
 */

// files with weird names need to be grouped into sf/v2/v3 manually
const fileGroupAssociations = {
    'orders.v2.oas2': 'v2',
};

/**
 * Creates a temporary directory within the project for processing.
 * This avoids cross-device link issues.
 *
 * @returns {Promise<string>} The path to the temporary directory
 */
async function makeTempDir() {
    const projectBaseTempDir = join(cwd(), '.tmp-generate');
    const tempOutputDir = join(projectBaseTempDir, `${packageJson.name.split('/').slice(-1)[0]}-${uuid()}`);
    await mkdir(tempOutputDir, { recursive: true });
    return tempOutputDir;
}

/**
 * Processes a YAML file into a module info object
 * @param {string} yamlFilename - The YAML filename to process
 * @returns {ModuleInfo} The module information
 * @example
 * {
 *   moduleName: "orders",
 *   groupName: "v2",
 *   dirPath: "orders",
 *   yamlFilename: "orders.v2.oas2.yaml",
 *   tsFilename: "orders/orders.v2.ts",
 *   exportName: "ordersV2"
 * }
 */
function prepareYamlFile(yamlFilename) {
    const jsIdentifier = value => value.replace(/-/g, '_');
    const baseFilename = basename(yamlFilename);
    const filenameParts = baseFilename.split('.').slice(0, -1);
    const exportName = jsIdentifier(filenameParts[0]);
    const moduleName = jsIdentifier(filenameParts.join('.'));
    const dirPath = dirname(yamlFilename);
    const tsFilename = dirPath === '.' ? `${moduleName}.ts` : `${dirPath}/${moduleName}.ts`;

    // Determine group name based on version suffix or manual associations
    let groupName = fileGroupAssociations[moduleName];
    if (!groupName && filenameParts.length > 1) {
        const lastPart = filenameParts[filenameParts.length - 1];
        if (['v2', 'v3', 'sf'].includes(lastPart)) {
            groupName = jsIdentifier(lastPart);
        }
    }

    return {
        moduleName,
        groupName,
        dirPath,
        yamlFilename,
        tsFilename,
        exportName,
    };
}
/**
 * Generates TypeScript files from YAML files
 * @param {string} sourceDir - The source directory containing YAML files
 * @param {string} outputDir - The output directory for TypeScript files
 * @param {string[]} yamlFiles - Array of YAML filenames to process
 */
async function generateTypeScript(sourceDir, outputDir, yamlFiles) {
    const modules = yamlFiles.map(prepareYamlFile);

    // Create directories
    await Promise.all(
        modules.map(({ dirPath }) => mkdir(join(outputDir, dirPath), { recursive: true }))
    );

    // Generate TypeScript files using the OpenAPI TypeScript library and ts-morph
    const project = new Project();
    await Promise.all(
        modules.map(async ({ yamlFilename, tsFilename }) => {
            const sourcePath = `${sourceDir}/${yamlFilename}`;
            const outputPath = `${outputDir}/${tsFilename}`;
            console.log(`Generating ${tsFilename} from ${yamlFilename}`);

            try {
                const ast = await openapiTS(new URL(sourcePath), {
                    immutable: true,
                    // TECH DEBT: Workaround for https://github.com/openapi-ts/openapi-typescript/issues/1520
                    // By default OpenAPI TypeScript treats empty objects in the response body spec
                    // as Record<string, never> which is not compatible with our operation inference
                    emptyObjectsUnknown: true,
                });

                const sourceFile = project.createSourceFile(outputPath, astToString(ast));
                const processedSource = processApiSource(sourceFile);
                processedSource.save();
            } catch (error) {
                console.error(`Failed to generate TypeScript for ${yamlFilename}:`, error);
                throw error;
            }
        })
    );

    // Generate exports directory with combined types
    await mkdir(`${outputDir}/exports`);

    // Modified export generation to work with AST output
    // TECH DEBT: This section is confusing now, and should possibly be reworked to also
    // use ts-morph
    const exportGroups = [...new Set(modules.map(mod => mod.groupName))];
    await Promise.all(
        exportGroups.map(async groupName => {
            const groupModules = modules.filter(module => module.groupName === groupName);
            const fileContent =
                FILE_BANNER +
                `import type { InferOperationIndex } from "../../operation-inference.js";

${groupModules
    .map(
        ({ moduleName, exportName, dirPath }) =>
            `import type * as ${exportName} from "../${
                dirPath !== '.' ? `${dirPath}/` : ''
            }${moduleName}.js";`
    )
    .join('\n')}

export type Operation =
${groupModules.map(({ exportName }) => `   & InferOperationIndex<${exportName}.paths>`).join('\n')};
`;
            await writeFile(`${outputDir}/exports/${groupName || 'misc'}.ts`, fileContent);
        })
    );
}

/**
 * Replaces a directory with another
 * @param {string} source - Source directory path
 * @param {string} destination - Destination directory path
 */
async function replaceDir(source, destination) {
    await rm(destination, { recursive: true, force: true });
    await rename(source, destination);
}

/**
 * Main function to generate TypeScript types from BigCommerce API specs
 */
async function main() {
    const sourceDir =
        process.argv[2] || 'https://raw.githubusercontent.com/bigcommerce/docs/main/reference';
    const tempOutputDir = await makeTempDir();
    const outputDir = `${__dirname}/generated`;

    try {
        // Some files in the BigCommerce reference docs folder should not
        // be processed. These can be added to blacklist.json and will be
        // filtered out of the list of files to process.
        // Blacklist rules can be disabled if they are not needed but it's
        // useful to know that they once were
        const blacklistFiles = blacklistConfig
            .filter(entry => entry.enabled !== false)
            .map(entry => entry.filename);

        const yamlFiles = filesConfig.filter(filename => !blacklistFiles.includes(filename));

        await generateTypeScript(sourceDir, tempOutputDir, yamlFiles);
        await replaceDir(tempOutputDir, outputDir);
    } catch (error) {
        console.error('Failed to generate TypeScript types:', error);
        process.exitCode = 1;
    } finally {
        // Clean up the temporary build directory
        await rm(tempOutputDir, { recursive: true, force: true });
    }
}

main();
