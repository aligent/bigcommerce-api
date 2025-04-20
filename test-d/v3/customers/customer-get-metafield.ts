import { Client, expectType } from '../../index.test-d.js';

export default (client: Client) => {
    client.v3
        .get('/customers/{customerId}/metafields/{metafieldId}', {
            path: {
                customerId: 1234,
                metafieldId: 4321,
            },
        })
        .then(response => {
            // @ts-expect-error - Change this test if BigCommerce fixes the documentation: https://github.com/bigcommerce/docs/issues/912
            expectType<Expected>(response);
        });
};

type Expected = {
    readonly items?: {
        readonly id: number;
        readonly key: string;
        readonly value: string;
        readonly namespace: string;
        readonly permission_set:
            | 'app_only'
            | 'read'
            | 'write'
            | 'read_and_sf_access'
            | 'write_and_sf_access';
        readonly resource_type:
            | 'cart'
            | 'customer'
            | 'location'
            | 'product'
            | 'category'
            | 'brand'
            | 'order'
            | 'variant'
            | 'channel';
        readonly resource_id: number;
        readonly description: string;
        readonly date_created: string;
        readonly date_modified: string;
        readonly owner_client_id?: string;
    };
};
