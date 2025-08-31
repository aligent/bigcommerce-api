import { Client, expectType } from '../../index.test-d.js';

export default (client: Client) => {
    client.v3
        .post('/catalog/products/metafields', {
            body: [
                {
                    permission_set: 'app_only',
                    namespace: 'Sales Department',
                    key: 'Staff Name',
                    value: 'Ronaldo',
                    resource_id: 42,
                },
            ],
        })
        .then(response => {
            expectType<Expected>(response);
        });
};

type Expected = ReadonlyArray<{
    readonly value: string;
    readonly key: string;
    readonly description: string;
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
    readonly resource_type:
        | 'brand'
        | 'product'
        | 'variant'
        | 'category'
        | 'cart'
        | 'channel'
        | 'location'
        | 'order'
        | 'customer';
    readonly owner_client_id: string;
}>;
