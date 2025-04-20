import { SyntaxKind } from 'ts-morph';

/**
 * Given a parent node, remove all properties that match the regex if they are optional and their type is never
 *
 * @param {Node} node - The parent node to look for properties to remove on
 * @param {RegExp} regex - Regex for property keys to remove
 * @returns {Node} The modified parent node
 *
 * @example
 * interface paths {
 *   "/test": {
 *     get: {};
 *     post?: never;
 *   };
 * }
 *
 * removeUnusedMethods(paths, /get|post|put/)
 *
 * // Result:
 * interface paths {
 *   "/test": {
 *     get: {};
 *   };
 * }
 *
 * @description This exists because openapi-typescript generates properties for ALL
 * standard methods on a path, giving them a type of `never` if the schema does not
 * provide an implementation. This is technically correct but increases the complexity
 * of type inference without much benefit in this library.
 */
export function removeUnusedMethods(node, regex) {
    node.getDescendantsOfKind(SyntaxKind.PropertySignature)
        .filter(prop => {
            if (!prop.getQuestionTokenNode()) return false;
            if (!prop.getTypeNode()?.isKind(SyntaxKind.NeverKeyword)) return false;
            if (!prop.getName().match(regex)) return false;
            return true;
        })
        .forEach(prop => {
            prop.remove();
        });

    return node;
}

/**
 * Given a parent node, find all header parameters and make them optional if they match the regex
 * If all of the parameters on the header object are optional, then make the header object optional as well
 *
 * @param {Node} node - The parent node to look for header parameters on
 * @param {RegExp} regex - Regex for header parameter keys to make optional
 * @returns {Node} The modified parent node
 *
 * @example
 * interface operations {
 *   "GET /test": {
 *     parameters: {
 *       header: {
 *          Accept: string;
 *          "Content-Type": string;
 *       };
 *     };
 *   };
 * }
 *
 * makeParameterHeadersOptional(operations, /Accept|Content-Type/)
 *
 * // Result:
 * interface operations {
 *   "GET /test": {
 *     parameters: {
 *       header?: {
 *         Accept?: string;
 *         "Content-Type"?: string;
 *       };
 *     };
 *   };
 *
 * @description This exists because the BigCommerce schemas declare some header values
 * as required on all calls. This library implements a client to handle setting these
 * values, so the types should communicate that users do not have to set them.
 * Doing this at the type level is quite complex, so we prefer to do it prior to writing
 * the typescript output
 */
export function makeParameterHeadersOptional(node, regex) {
    node.getDescendantsOfKind(SyntaxKind.PropertySignature)
        .filter(prop => {
            if (!(prop.getName() === 'header')) return false;
            if (!prop.getTypeNode()?.isKind(SyntaxKind.TypeLiteral)) return false;
            return true;
        })
        .forEach(prop => {
            const children = prop.getDescendantsOfKind(SyntaxKind.PropertySignature);
            children.forEach(child => {
                if (child.getName().match(regex)) {
                    child.setHasQuestionToken(true);
                }
            });

            if (children.every(child => child.hasQuestionToken())) {
                prop.setHasQuestionToken(true);
            }
        });

    return node;
}

/**
 * Given a parent node, remove response codes that match the regex where:
 * - The "application/json" property is of type `Record<string, unknown>` (i.e. unknown object)
 * - There is another response code matching the regex with a non-unknown object
 *
 * @param {Node} node - The parent node to look for responses codes on
 * @param {RegExp} regex - Regex for response codes to remove
 * @returns {Node} The modified parent node
 *
 * @example
 * interface operations {
 *   "GET /test": {
 *     responses: {
 *       "200": {
 *         content: {
 *           "application/json": {
 *             schema: {
 *               type: "object";
 *             };
 *           };
 *         };
 *       };
 *       "201": {
 *         content: {
 *           "application/json": Record<string, unknown>;
 *         };
 *       };
 *     };
 * }
 *
 * removeEmptyResponsesCodes(operations, /200|201/)
 *
 * // Result:
 * interface operations {
 *   "GET /test": {
 *     responses: {
 *       "200": {
 *         content: {
 *           "application/json": {
 *             schema: {
 *               type: "object";
 *             };
 *           };
 *         };
 *       };
 *     };
 * }
 *
 * @description This exists because the BigCommerce schemas sometimes declare additional
 * success codes with empty response objects. These seem spurious (e.g. 201 for a PUT endpoint)
 * so we choose to remove them instead.
 */
function removeEmptyResponseCodes(node, regex) {
    node
        // Get each "responses" property under the parent node
        .getDescendantsOfKind(SyntaxKind.PropertySignature)
        .filter(prop => {
            if (!(prop.getName() === 'responses')) return false;
            if (!prop.getTypeNode()?.isKind(SyntaxKind.TypeLiteral)) return false;
            return true;
        })
        .forEach(responseNode => {
            // Get each response code under the "responses" property matching the regex,
            // build a utility object with a reference to the node and the type of the "application/json" property
            const matchingCodes = responseNode
                .getDescendantsOfKind(SyntaxKind.PropertySignature)
                .filter(code => code.getName().match(regex))
                .map(code => {
                    return {
                        code: code,
                        jsonType: code
                            .getDescendants()
                            .filter(
                                node =>
                                    node.isKind(SyntaxKind.PropertySignature) &&
                                    node.getName() === `"application/json"`
                            )?.[0]
                            ?.getTypeNode()
                            ?.getText(),
                    };
                });

            // Filter the matching codes to only include those where the "application/json" property is of type `Record<string, unknown>`
            const emptyCodes = matchingCodes.filter(
                ({ jsonType }) => jsonType === 'Record<string, unknown>'
            );

            // If there are more matching codes than empty codes (i.e. at least one useful response code), remove the empty codes
            if (emptyCodes.length < matchingCodes.length)
                emptyCodes.forEach(({ code }) => {
                    code.remove();
                });
        });

    return node;
}

export const FILE_BANNER = `/**
 * This file was auto-generated by openapi-typescript and ts-morph.
 * Do not make direct changes to the file.
 */

`;

/**
 * Modify an OpenAPI produced AST and save the changes to a file
 * @param {Project} project - The ts-morph project instance
 * @param {Node} ast - The AST to modify
 * @param {string} filePath - The path to the file to save the changes to
 */
export function processApiSource(source) {
    removeUnusedMethods(
        source.getInterfaceOrThrow('paths'),
        /get|put|post|delete|options|head|patch|trace/
    );
    makeParameterHeadersOptional(source.getInterfaceOrThrow('operations'), /Accept|Content-Type/);
    removeEmptyResponseCodes(source.getInterfaceOrThrow('operations'), /200|201|204/);
    source.insertStatements(0, [FILE_BANNER]);

    return source;
}
