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
 * If you need to use a path which is not part if the spec, you can pass it
 * into the client via a type parameter to avoid TypeScript errors, e.g.:
 *
 *   type MyExtraEndpoints =
 *     | 'GET /v3/foo/bar'
 *     | 'POST /v3/foo/bar'
 *     | 'GET /v2/foo/baz'
 *   ;
 *
 *   bigCommerce = new Client<MyExtraEndpoints>(config)
 */

export class Client<CustomEndpoints extends string = never> {
    constructor(private readonly config: Config) {
        this.v2 = new V2.Client<ExtractSubpaths<'/v2', CustomEndpoints>>(this.config);
        this.v3 = new V3.Client<ExtractSubpaths<'/v3', CustomEndpoints>>(this.config);
    }

    readonly v2: V2.Client<ExtractSubpaths<'/v2', CustomEndpoints>>;
    readonly v3: V3.Client<ExtractSubpaths<'/v3', CustomEndpoints>>;
}

type ExtractSubpaths<
    Path extends string,
    AllCustomEndpoints extends string,
> = AllCustomEndpoints extends `${infer Method} ${Path}${infer Subpath}`
    ? `${Method} ${Subpath}`
    : never;
