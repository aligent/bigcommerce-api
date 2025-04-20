// TECH DEBT: Work out if these eslint rules are reasonable in this context
/* eslint-disable @typescript-eslint/no-empty-object-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { RequestMethod } from '../operation.js';

// Takes an OpenAPI paths specification and converts it into our internal operation index format,
// removing any undefined endpoints and flattening the paths into a single type
export type InferOperationIndex<PathsSpec> = Flatten<{
    [PathStr in keyof PathsSpec & string]: PathOperationIndex<PathStr, PathsSpec[PathStr]>;
}>;

// Takes a record of types and flattens them into a single intersection type
// This combines all the operations from different paths into one type
type Flatten<T extends Record<string, any>> = UnionToIntersection<T[keyof T]>;
type UnionToIntersection<T> = (T extends any ? (x: T) => any : never) extends (x: infer R) => any
    ? R
    : never;

// Converts an OpenAPI 3.0 path specification into our operation index format
// Currently this only extracts type details for application/json request bodies
type PathOperationIndex<Path extends string, PathSpec> = {
    [K in keyof PathSpec as K extends RequestMethodLc
        ? `${Uppercase<K>} ${Path}`
        : never]: PathSpec[K] extends { parameters?: infer Params; responses?: infer Responses }
        ? PathSpec[K] extends {
              requestBody: { content: { 'application/json': infer RequestBody } };
          }
            ? {
                  readonly parameters: (unknown extends Params ? {} : Params) & {
                      body: RequestBody;
                  };
                  readonly response: Response<Responses>;
              }
            : {
                  readonly parameters: unknown extends Params ? {} : Params;
                  readonly response: Response<Responses>;
              }
        : never;
};

// Lowercase version of our RequestMethod type
// Used for matching HTTP methods in OpenAPI specs which are typically lowercase
type RequestMethodLc = Lowercase<RequestMethod>;

// Converts OpenAPI response specifications into our internal response format
type Response<ResponsesSpec> = {
    [Status in keyof ResponsesSpec]: {
        status: Status;
        body: ResponsesSpec[Status] extends { content: { 'application/json': infer ResponseBody } }
            ? ResponseBody
            : never;
    };
}[keyof ResponsesSpec];
