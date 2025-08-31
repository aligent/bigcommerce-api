import type { RequestMethod } from '../operation.js';
import type { Flatten, IsOptional } from '../type-utils.js';

// Takes an OpenAPI paths specification and converts it into our internal operation index format,
// removing any undefined endpoints and flattening the paths into a single type
export type InferOperationIndex<PathsSpec> = Flatten<{
    [PathStr in keyof PathsSpec & string]: PathOperationIndex<PathStr, PathsSpec[PathStr]>;
}>;

/**
 * @description Formats the OpenAPI parameters, responses, and responseBody specs at a given path
 * in preparation for flattening the paths in to a single index type
 *
 * @see InferOperationIndex for more information
 */
type PathOperationIndex<Path extends string, PathSpec> = {
    [K in keyof PathSpec as PathKey<K, Path>]: PathSpec[K] extends {
        parameters?: infer Params;
        responses?: infer Responses;
          }
            ? {
              parameters: Params & ParamsRequestBody<PathSpec[K]>;
              response: ResponseUnion<Responses>;
              }
        : never;
};

/**
 * @description Combines the REST operation method with the endpoint path to form a unique key
 * @example
 * ```ts
 * type A = PathKey<'get', '/path/a'>
 * // A is 'GET /path/a'
 */
type PathKey<K, Path extends string> =
    K extends Lowercase<RequestMethod> ? `${Uppercase<K>} ${Path}` : never;

/**
 * @description Converts OpenAPI response specifications into a union of possible responses
 * Only responses with a 'application/json' content type are included
 *
 * @example
 * ```ts
 * type A = Response<{
 *   200: { content: { 'application/json': { a: string } } };
 *   204: { content: { 'application/json': {} } };
 * }>;
 * // A is { status: 200, body: { a: string } } | { status: 204, body: {} }
 * ```
 */
type ResponseUnion<ResponsesSpec> = {
    [Status in keyof ResponsesSpec]: {
        status: Status;
        body: ResponsesSpec[Status] extends { content: { 'application/json': infer ResponseBody } }
            ? ResponseBody
            : never;
    };
}[keyof ResponsesSpec];

/**
 * @description Extracts the request body from an OpenAPI specification
 * - Keeps the optional or required nature of the request body from the original spec
 * - Only includes 'application/json' content type request bodies
 * - Returns a type with no body property if the original spec has no request body property (e.g. GET requests)
 *
 * @example
 * ```ts
 * type A = ParamsRequestBody<{
 *   requestBody: { content: { 'application/json': { a: string } } };
 * }>;
 * // A is { body: { a: string } }
 * ```
 */
type ParamsRequestBody<PathSpec> = PathSpec extends {
    requestBody?: { content: { 'application/json': infer RequestBody } };
}
    ? unknown extends RequestBody
        ? unknown
        : IsOptional<PathSpec, 'requestBody'> extends true
          ? Partial<{ body: RequestBody }>
          : { body: RequestBody }
    : never;
