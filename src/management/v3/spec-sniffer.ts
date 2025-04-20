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
        ? // TECH DEBT: Work out if these eslint rules are reasonable in this context
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          Ops[K]['response']['body'] extends { data?: any }
            ? never
            : K
        : never;
}[keyof Ops];
