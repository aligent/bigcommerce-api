// TECH DEBT: Work out if these eslint rules are reasonable in this context
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-empty-object-type */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Agent } from 'http';
import { Agent as HttpsAgent } from 'https';
import fetch, { Response as FetchResponse } from 'node-fetch';
import qs from 'query-string';

/**
 * @description HTTP methods supported by the API
 */
export type RequestMethod = 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT';

/**
 * @description Represents a complete API request with its endpoint and parameters
 */
export type Request<
    ReqLine extends RequestLine = RequestLine,
    Params extends Parameters = Parameters,
> = {
    readonly requestLine: ReqLine;
    readonly parameters: Params;
};

/**
 * @description Represents an API endpoint in the format "METHOD /path"
 * e.g., "GET /products" or "POST /orders"
 */
export type RequestLine = `${RequestMethod} ${string}`;

/**
 * @description Represents all possible parameter types that can be sent with a request:
 */
export type Parameters = {
    /**
     * @description URL path parameters (e.g., /products/{id})
     */
    readonly path?: Record<string, any>;
    /**
     * @description URL query parameters
     */
    readonly query?: any;
    /**
     * @description Request body data
     */
    readonly body?: any;
    /**
     * @description Custom HTTP headers
     */
    readonly header?: Record<string, any>;
};

/**
 * @description Represents an API response with status code and optional body
 */
export type Response = {
    readonly status: number | string;
    readonly body?: any;
};

// Namespace for response-related type utilities
export namespace Response {
    type SuccessStatus = 200 | 201 | 204;

    /**
     * @description Extracts and formats the possible success responses for an operation
     */
    export type Success<T extends Response | Operation> = T extends Operation
        ? Success<T['response']>
        : T extends { status: SuccessStatus }
          ? T
          : never;
}

/**
 * @description Represents a complete API operation with its parameters and expected response
 */
export type Operation = {
    readonly parameters: Request['parameters'];
    readonly response: Response;
};

// Namespace for operation-related type utilities
// TODO: MI-199 - determine if this is still required
export namespace Operation {
    /**
     * @description Extracts the minimal required input parameters for an operation
     */
    export type MinimalInput<Op extends Operation> = InputParameters<Op['parameters']>;

    /**
     * @description Makes properties optional if they're on the 'query' object
     */
    type MakeQueryParamsOptional<
        OpParams extends Operation['parameters'],
        K extends keyof OpParams,
    > = K extends 'query' ? Partial<OpParams[K]> : OpParams[K];

    /**
     * @description Makes properties optional if they can be empty objects
     */
    type MakeEmptyObjectOptional<T> = {
        readonly [K in keyof T as {} extends T[K] ? K : never]?: T[K];
    } & {
        readonly [K in keyof T as {} extends T[K] ? never : K]: T[K];
    };

    /**
     * @description Prepares request parameters by making query params and any possibly empty params optional
     */
    type InputParameters<OpParams extends Operation['parameters']> = MakeEmptyObjectOptional<{
        [K in keyof OpParams]: MakeQueryParamsOptional<OpParams, K>;
    }>;
}

/**
 * @description Maps request lines to their corresponding operations
 */
export type OperationIndex = Record<string, Operation>;

// Namespace for operation index utilities
export namespace OperationIndex {
    /**
     * @description Filters operations to only include those with optional parameters
     */
    export type FilterOptionalParams<Ops extends OperationIndex> = {
        [K in keyof Ops as {} extends Ops[K]['parameters'] ? K : never]: Ops[K];
    };
}

/**
 * @description Resolves the path for a request
 * @example
 * ```ts
 * resolvePath('/products/{id}', { id: 123 })
 * // returns '/products/123'
 * ```
 */
export function resolvePath(parameterizedPath: string, pathParams: Record<string, any>): string {
    return parameterizedPath
        .split('/')
        .map(el => {
            const match = el.match(/^\{(.+)\}$/);
            const paramName = match?.[1];
            if (!paramName) {
                return el;
            }
            const param = pathParams[paramName];
            if (param === null || param === undefined || param === '') {
                throw new Error(`Path param ${paramName} must be specified.`);
            }
            return encodeURIComponent(param);
        })
        .join('/');
}

/**
 * @description Transport function type that handles making the actual API requests
 */
export type Transport = (requestLine: string, params?: Parameters) => Promise<Response>;

/**
 * @description Configuration options for the fetch-based transport
 */
export type FetchTransportOptions = {
    readonly baseUrl: string;
    readonly headers: Record<string, string>;
    readonly agent?: Agent | undefined;
    readonly retry?:
        | boolean
        | {
              /**
               * Return true if the request should be retried, false otherwise
               */
              readonly shouldRetry?: (
                  attemptNum: number,
                  response: FetchResponse,
                  requestLine: string
              ) => boolean;

              /**
               * Return the backoff time in ms
               */
              readonly backoffTime?: (
                  numFailures: number,
                  response: FetchResponse,
                  requestLine: string
              ) => number;
          };
};

const defaultRetryConfig: Exclude<FetchTransportOptions['retry'], boolean | undefined> = {
    shouldRetry: (attemptNum, response) => {
        if (response.status === 429 && attemptNum < 50) {
            return true;
        }
        if (response.status >= 500 && response.status < 600 && attemptNum < 5) {
            return true;
        }
        return false;
    },

    backoffTime: numFailures => {
        const maxRandomization = 0.2;
        const randomization = 0.9 + Math.random() * maxRandomization;
        return numFailures * 500 * randomization;
    },
};

/**
 * @description Creates a fetch transport function
 * @example
 * ```ts
 * const transport = fetchTransport({
 *     baseUrl: 'https://api.bigcommerce.com/stores/1234567890/v3',
 *     headers: {
 *         'X-Auth-Token': '1234567890',
 *     },
 * });
 * ```
 * @param options - The options for the fetch transport
 * @returns
 */
export function fetchTransport(options: FetchTransportOptions): Transport {
    const { agent, baseUrl, headers, retry } = options;

    const shouldRetry =
        retry === false
            ? () => false
            : retry === true || retry?.shouldRetry === undefined
              ? defaultRetryConfig.shouldRetry!
              : retry.shouldRetry;

    const backoffTime =
        retry === false
            ? () => {
                  throw new Error();
              }
            : retry === true || retry?.backoffTime === undefined
              ? defaultRetryConfig.backoffTime!
              : retry.backoffTime;

    // BigCommerce API requires Accept: application/json for almost all requests
    // The OpenAPI specs list it as a required parameter, for ease of use we set it
    // as the default on all requests and modify the Typescript output to mark it as optional
    const staticHeaders = {
        'Accept-Encoding': 'gzip',
        Accept: 'application/json',
        ...headers,
    };

    return async (requestLine, params) => {
        const [method, paramaterizedPath] = requestLine.split(' ', 2);
        if (!(method && paramaterizedPath)) {
            throw new Error('Invalid request line');
        }
        const path = resolvePath(paramaterizedPath, params?.path ?? {});
        const queryParams = qs.stringify(params?.query ?? {}, {
            arrayFormat: 'comma',
        });
        const queryString = queryParams.length ? `?${queryParams}` : '';

        // File upload APIs support multipart/form-data requests
        // For these requests we need to leave the body as-is and
        // change the Accept header to */*
        // This is an undocumented requirement -
        // see https://support.bigcommerce.com/s/question/0D54O00007HtfGBSAZ/upload-image-as-multipartformdata?language=en_US for an example
        const contentTypeKeys = ['content-type', 'Content-Type'];
        const isformDataContent = contentTypeKeys.some(key =>
            params?.header?.[key]?.toLowerCase().includes('multipart/form-data')
        );

        const body =
            params?.body && (isformDataContent ? params.body : JSON.stringify(params.body));

        if (isformDataContent) {
            staticHeaders.Accept = '*/*';
        }

        const fetchFn = () =>
            fetch(`${baseUrl}${path}${queryString}`, {
                method,
                headers: {
                    ...(params?.body && !isformDataContent
                        ? { 'Content-Type': 'application/json' }
                        : {}),
                    ...staticHeaders,
                    ...params?.header,
                },
                agent: agent || new HttpsAgent({ maxSockets: 10, keepAlive: true }),
                body,
            });

        let response: FetchResponse;
        for (let attemptNum = 1; ; attemptNum++) {
            response = await fetchFn();
            if (!response.ok && shouldRetry(attemptNum, response, requestLine)) {
                await new Promise<void>(resolve =>
                    setTimeout(() => resolve(), backoffTime(attemptNum, response, requestLine))
                );
            } else {
                break;
            }
        }

        const responseBody = await response!.text();

        return {
            status: response!.status,
            body: responseBody && JSON.parse(responseBody),
        };
    };
}
