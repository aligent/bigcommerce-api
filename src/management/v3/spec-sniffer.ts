import type { Operations as Ops } from './index.js';

/**
 * This file is for rules which sniff bugs in the BigCommerce API specs.
 */

/**
 * NoDataElementInResponse should resolve to `never`. Any request lines which are resolved
 * are missing data elements in the response schema.
 */
export type NoDataElementInResponse = {
    [K in keyof Ops]: Ops[K]['response'] extends { status: 200 | 201 }
        ? Ops[K]['response']['body'] extends { data?: unknown }
            ? never
            : K
        : never;
}[keyof Ops];
