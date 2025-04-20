import { Client, expectType } from '../../index.test-d.js';
export default (client: Client) => {
    client.v3.get('/catalog/brands').then(response => {
        expectType<Expected>(response);
    });
};

type Expected = ReadonlyArray<{
    readonly name: string;
    readonly id: number;
    readonly page_title: string;
    readonly meta_keywords: readonly string[];
    readonly meta_description: string;
    readonly image_url: string;
    readonly search_keywords: string;
    readonly custom_url: {
        readonly url?: string;
        readonly is_customized?: boolean;
    };
}> | null;
