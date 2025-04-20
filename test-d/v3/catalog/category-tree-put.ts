import { Client, expectType } from '../../index.test-d.js';

export default (client: Client) => {
    client.v3
        .put('/catalog/trees', {
            body: [
                {
                    id: 0,
                    name: 'string',
                    channels: [0],
                },
            ],
        })
        .then(response => {
            expectType<Expected>(response);
        });
};

type Expected = ReadonlyArray<{
    readonly id: number;
    readonly name: string;
    readonly channels: readonly number[];
}>;
