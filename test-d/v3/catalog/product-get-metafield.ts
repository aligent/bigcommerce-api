import { Client, expectType } from '../../index.test-d.js';

export default (client: Client) => {
    client.v3
        .get('/catalog/products/{product_id}/metafields/{metafield_id}', {
            path: {
                product_id: 1234,
                metafield_id: 4321,
            },
        })
        .then(response => {
            expectType<Expected>(response);
        });
};

type Expected = {
    readonly value: string;
    readonly description: string;
    readonly key: string;
    readonly id: number;
    readonly date_created: string;
    readonly date_modified: string;
    readonly resource_id: number;
    readonly namespace: string;
    readonly permission_set:
        | 'app_only'
        | 'read'
        | 'write'
        | 'read_and_sf_access'
        | 'write_and_sf_access';
    readonly resource_type: 'category' | 'brand' | 'product' | 'variant';
    readonly owner_client_id: string;
} | null;
