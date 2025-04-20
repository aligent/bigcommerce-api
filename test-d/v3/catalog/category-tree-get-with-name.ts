import { Client, expectType } from '../../index.test-d.js';

export default (client: Client) => {
    client.v3
        .get('/catalog/trees/categories', {
            query: {
                name: 'string',
            },
        })
        .then(response => {
            expectType<Expected>(response);
        });
};

type Expected = ReadonlyArray<{
    readonly name: string;
    readonly url: { readonly path?: string; readonly is_customized?: boolean };
    readonly description: string;
    readonly parent_id: number;
    readonly views: number;
    readonly sort_order: number;
    readonly page_title: string;
    readonly meta_keywords: readonly string[];
    readonly meta_description: string;
    readonly layout_file: string;
    readonly image_url: string;
    readonly is_visible: boolean;
    readonly search_keywords: string;
    readonly default_product_sort:
        | 'use_store_settings'
        | 'featured'
        | 'newest'
        | 'best_selling'
        | 'alpha_asc'
        | 'alpha_desc'
        | 'avg_customer_review'
        | 'price_asc'
        | 'price_desc';
    readonly category_id: number;
    readonly category_uuid: string;
    readonly tree_id: number;
}> | null;
