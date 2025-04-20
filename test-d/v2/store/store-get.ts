import { Client, expectType } from '../../index.test-d.js';

export default (client: Client) => {
    client.v2.get('/store').then(response => {
        expectType<Expected>(response);
    });
};

type Expected = {
    readonly id?: string;
    readonly account_uuid?: string;
    readonly domain?: string;
    readonly secure_url?: string;
    readonly control_panel_base_url?: string;
    readonly status?: string;
    readonly name?: string;
    readonly first_name?: string;
    readonly last_name?: string;
    readonly address?: string;
    readonly country?: string;
    readonly country_code?: string;
    readonly infrastructure_region?: string;
    readonly phone?: string;
    readonly admin_email?: string;
    readonly order_email?: string;
    readonly favicon_url?: string;
    readonly timezone?: {
        readonly name?: string;
        readonly raw_offset?: number;
        readonly dst_offset?: number;
        readonly dst_correction?: boolean;
        readonly date_format?: {
            readonly display?: string;
            readonly export?: string;
            readonly extended_display?: string;
        };
    };
    readonly language?: string;
    readonly currency?: string;
    readonly currency_symbol?: string;
    readonly decimal_separator?: string;
    readonly thousands_separator?: string;
    readonly decimal_places?: number;
    readonly currency_symbol_location?: string;
    readonly weight_units?: string;
    readonly dimension_units?: string;
    readonly dimension_decimal_places?: number;
    readonly dimension_decimal_token?: string;
    readonly dimension_thousands_token?: string;
    readonly plan_name?: string;
    readonly plan_level?: string;
    readonly plan_is_trial?: boolean;
    readonly industry?: string;
    readonly logo?:
        | {
              readonly url?: string;
          }
        | readonly unknown[];
    readonly is_price_entered_with_tax?: boolean;
    readonly store_id?: number;
    readonly default_channel_id: number;
    readonly default_site_id?: number;
    readonly active_comparison_modules?: readonly unknown[];
    readonly features?: {
        readonly stencil_enabled: boolean;
        readonly sitewidehttps_enabled?: boolean;
        readonly facebook_catalog_id?: string;
        readonly checkout_type?: 'optimized' | 'single' | 'single_customizable' | 'klarna';
        readonly wishlists_enabled?: boolean;
        readonly graphql_storefront_api_enabled: boolean;
        readonly shopper_consent_tracking_enabled?: boolean;
        readonly multi_storefront_enabled: boolean;
        readonly storefront_limits?: {
            readonly active: number;
            readonly total_including_inactive: number;
        };
    };
} | null;
