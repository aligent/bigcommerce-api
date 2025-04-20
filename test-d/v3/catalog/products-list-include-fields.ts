import { Client, expectType } from '../../index.test-d.js';

export default async (client: Client) => {
    const response = client.v3.list('/catalog/products', {
        query: {
            include_fields: ['sku', 'preorder_release_date'],
        },
    });

    expectType<Expected>(response);
};

type Expected = AsyncIterable<{
    readonly id: number;
    readonly sku: string;
    readonly preorder_release_date: string | null;
}>;
