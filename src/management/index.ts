import { Agent } from 'http';
import * as V2 from './v2/index.js';
import * as V3 from './v3/index.js';

export * as V2 from './v2/index.js';
export * as V3 from './v3/index.js';

export type Config = {
    readonly storeHash: string;
    readonly accessToken: string;
    readonly agent?: Agent;
};

/**
 * The main client for interacting with the BigCommerce Management API.
 * It provides access to both V2 and V3 API endpoints through dedicated
 * versioned clients.
 *
 * @template CustomEndpoints - A string literal type representing custom API paths
 *   that are not part of the official BigCommerce API specification. This allows
 *   type-safe access to non-standard endpoints.
 *
 * @example
 * // Define custom endpoints
 * type MyExtraEndpoints =
 *   | 'GET /v3/foo/bar'
 *   | 'POST /v3/foo/bar'
 *   | 'GET /v2/foo/baz';
 *
 * // Instantiate the client with custom endpoints
 * const config: Config = { storeHash: '...', accessToken: '...' };
 * const bigCommerce = new Client<MyExtraEndpoints>(config);
 *
 * // Access standard and custom endpoints
 * await bigCommerce.v3.get('/catalog/products');
 * await bigCommerce.v3.get('/foo/bar'); // Custom endpoint accepted by typescript
 */
export class Client<CustomEndpoints extends string = never> {
    /**
     * Initializes the API client with configuration options.
     * @param config - The configuration object containing store hash, access token, and optional agent.
     */
    constructor(private readonly config: Config) {
        this.v2 = new V2.Client<ExtractSubpaths<'/v2', CustomEndpoints>>(this.config);
        this.v3 = new V3.Client<ExtractSubpaths<'/v3', CustomEndpoints>>(this.config);
    }

    /**
     * Client instance for interacting with V2 Management API endpoints.
     */
    readonly v2: V2.Client<ExtractSubpaths<'/v2', CustomEndpoints>>;
    /**
     * Client instance for interacting with V3 Management API endpoints.
     */
    readonly v3: V3.Client<ExtractSubpaths<'/v3', CustomEndpoints>>;
}

type ExtractSubpaths<
    Path extends string,
    AllCustomEndpoints extends string,
> = AllCustomEndpoints extends `${infer Method} ${Path}${infer Subpath}`
    ? `${Method} ${Subpath}`
    : never;
