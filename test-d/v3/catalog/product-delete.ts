import { Client, expectType } from '../../index.test-d.js';

export default (client: Client) => {
    client.v3.delete('/catalog/products').then(response => {
        expectType<Expected>(response);
    });
};

// TECH DEBT: Work out if these eslint rules are reasonable in this context
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type Expected = {} | null;
