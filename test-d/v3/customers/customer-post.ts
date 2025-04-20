import { Client, expectType } from '../../index.test-d.js';

export default (client: Client) => {
    client.v3
        .post('/customers', {
            body: [
                {
                    email: 'john.doe@example.com',
                    first_name: 'John',
                    last_name: 'Doe',
                },
                {
                    email: 'jane.doe@example.com',
                    first_name: 'Jane',
                    last_name: 'Doe',
                },
            ],
        })
        .then(response => {
            expectType<Expected>(response);
        });
};

type Expected = ReadonlyArray<{
    readonly id: number;
    readonly attributes: ReadonlyArray<{
        readonly attribute_id?: number;
        readonly attribute_value?: string;
        readonly customer_id?: number;
        readonly date_created?: string;
        readonly date_modified?: string;
        readonly id?: number;
    }>;
    readonly email: string;
    readonly customer_group_id: number;
    readonly date_created: string;
    readonly date_modified: string;
    readonly addresses: ReadonlyArray<{
        readonly first_name: string;
        readonly last_name: string;
        readonly company?: string;
        readonly address1: string;
        readonly address2?: string;
        readonly city: string;
        readonly state_or_province: string;
        readonly postal_code: string;
        readonly country_code: string;
        readonly phone?: string;
        readonly address_type?: 'residential' | 'commercial';
        readonly customer_id: number;
        readonly id: number;
        readonly country?: string;
        readonly form_fields?: ReadonlyArray<{
            readonly name: string;
            readonly value: string | number | readonly string[];
        }>;
    }>;
    readonly first_name: string;
    readonly last_name: string;
    readonly company: string;
    readonly phone: string;
    readonly form_fields: ReadonlyArray<{
        readonly name: string;
        readonly value: string | number | readonly string[];
        readonly customer_id: number;
    }>;
    readonly registration_ip_address: string;
    readonly notes: string;
    readonly tax_exempt_category: string;
    readonly address_count: number;
    readonly attribute_count: number;
    readonly authentication: {
        readonly force_password_reset?: boolean;
    };
    readonly store_credit_amounts: ReadonlyArray<{
        readonly amount?: number;
    }>;
    readonly accepts_product_review_abandoned_cart_emails: boolean;
    readonly origin_channel_id: number;
    readonly channel_ids: readonly unknown[];
}>;
