import { Client, expectType } from '../../index.test-d.js';

export default (client: Client) => {
    client.v3
        .put('/catalog/products/{product_id}', {
            path: {
                product_id: 1234,
            },
            body: {
                categories: [10, 20, 30],
            },
        })
        .then(response => {
            expectType<Expected>(response);
        });
};

type Expected = {
    readonly name: string;
    readonly type: 'physical' | 'digital';
    readonly id: number;
    readonly height: number;
    readonly width: number;
    readonly options: ReadonlyArray<{
        readonly id?: number | null;
        readonly product_id?: number;
        readonly display_name?: string;
        readonly type?:
            | 'radio_buttons'
            | 'rectangles'
            | 'dropdown'
            | 'product_list'
            | 'product_list_with_images'
            | 'swatch';
        readonly config?: {
            readonly default_value?: string;
            readonly checked_by_default?: boolean;
            readonly checkbox_label?: string;
            readonly date_limited?: boolean;
            readonly date_limit_mode?: 'earliest' | 'range' | 'latest';
            readonly date_earliest_value?: string;
            readonly date_latest_value?: string;
            readonly file_types_mode?: 'specific' | 'all';
            readonly file_types_supported?: readonly string[];
            readonly file_types_other?: readonly string[];
            readonly file_max_size?: number;
            readonly text_characters_limited?: boolean;
            readonly text_min_length?: number;
            readonly text_max_length?: number;
            readonly text_lines_limited?: boolean;
            readonly text_max_lines?: number;
            readonly number_limited?: boolean;
            readonly number_limit_mode?: 'lowest' | 'highest' | 'range';
            readonly number_lowest_value?: number;
            readonly number_highest_value?: number;
            readonly number_integers_only?: boolean;
            readonly product_list_adjusts_inventory?: boolean;
            readonly product_list_adjusts_pricing?: boolean;
            readonly product_list_shipping_calc?: 'none' | 'weight' | 'package';
        };
        readonly sort_order?: number;
        readonly option_values?: ReadonlyArray<{
            readonly is_default?: boolean;
            readonly label: string;
            readonly sort_order: number;
            readonly value_data?: { [x: string]: unknown } | null;
            readonly id?: number;
        }>;
    }>;
    readonly description: string;
    readonly price: number;
    readonly date_created: string;
    readonly date_modified: string;
    readonly weight: number;
    readonly sort_order: number;
    readonly page_title: string;
    readonly meta_keywords: readonly string[];
    readonly meta_description: string;
    readonly layout_file: string;
    readonly is_visible: boolean;
    readonly search_keywords: string;
    readonly bulk_pricing_rules: ReadonlyArray<{
        readonly id: number;
        readonly quantity_min: number;
        readonly quantity_max: number;
        readonly type: 'price' | 'percent' | 'fixed';
        readonly amount: number | string;
    }>;
    readonly modifiers: ReadonlyArray<{
        readonly type:
            | 'date'
            | 'checkbox'
            | 'file'
            | 'text'
            | 'multi_line_text'
            | 'numbers_only_text'
            | 'radio_buttons'
            | 'rectangles'
            | 'dropdown'
            | 'product_list'
            | 'product_list_with_images'
            | 'swatch';
        readonly required: boolean;
        readonly sort_order?: number;
        readonly config?: {
            readonly default_value?: string;
            readonly checked_by_default?: boolean;
            readonly checkbox_label?: string;
            readonly date_limited?: boolean;
            readonly date_limit_mode?: 'earliest' | 'range' | 'latest';
            readonly date_earliest_value?: string;
            readonly date_latest_value?: string;
            readonly file_types_mode?: 'specific' | 'all';
            readonly file_types_supported?: readonly string[];
            readonly file_types_other?: readonly string[];
            readonly file_max_size?: number;
            readonly text_characters_limited?: boolean;
            readonly text_min_length?: number;
            readonly text_max_length?: number;
            readonly text_lines_limited?: boolean;
            readonly text_max_lines?: number;
            readonly number_limited?: boolean;
            readonly number_limit_mode?: 'lowest' | 'highest' | 'range';
            readonly number_lowest_value?: number;
            readonly number_highest_value?: number;
            readonly number_integers_only?: boolean;
            readonly product_list_adjusts_inventory?: boolean;
            readonly product_list_adjusts_pricing?: boolean;
            readonly product_list_shipping_calc?: 'none' | 'weight' | 'package';
        };
        readonly display_name?: string;
        readonly id?: number;
        readonly product_id?: number;
        readonly name?: string;
        readonly option_values?: ReadonlyArray<{
            readonly is_default?: boolean;
            readonly label: string;
            readonly sort_order: number;
            readonly value_data?: { [x: string]: unknown } | null;
            readonly adjusters?: {
                readonly price?: {
                    readonly adjuster?: 'relative' | 'percentage' | null;
                    readonly adjuster_value?: number;
                };
                readonly weight?: {
                    readonly adjuster?: 'relative' | 'percentage' | null;
                    readonly adjuster_value?: number;
                };
                readonly image_url?: string;
                readonly purchasing_disabled?: {
                    readonly status?: boolean;
                    readonly message?: string;
                };
            };
            readonly id?: number;
            readonly option_id?: number;
        }>;
    }>;
    readonly custom_fields: ReadonlyArray<{
        readonly id?: number;
        readonly name: string;
        readonly value: string;
    }>;
    readonly videos: ReadonlyArray<{
        readonly title?: string;
        readonly description?: string;
        readonly sort_order?: number;
        readonly type?: 'youtube';
        readonly video_id?: string;
        readonly id?: number;
        readonly product_id?: number;
        readonly length?: string;
    }>;
    readonly sku: string;
    readonly date_last_imported: string;
    readonly inventory_level: number;
    readonly total_sold: number;
    readonly calculated_price: number;
    readonly depth: number;
    readonly cost_price: number;
    readonly retail_price: number;
    readonly sale_price: number;
    readonly map_price: number;
    readonly tax_class_id: number;
    readonly product_tax_code: string;
    readonly categories: readonly number[];
    readonly brand_id: number;
    readonly option_set_id: number;
    readonly option_set_display: string;
    readonly inventory_warning_level: number;
    readonly inventory_tracking: 'none' | 'product' | 'variant';
    readonly reviews_rating_sum: number;
    readonly reviews_count: number;
    readonly fixed_cost_shipping_price: number;
    readonly is_free_shipping: boolean;
    readonly is_featured: boolean;
    readonly related_products: readonly number[];
    readonly warranty: string;
    readonly bin_picking_number: string;
    readonly upc: string;
    readonly mpn: string;
    readonly gtin: string;
    readonly availability: 'available' | 'disabled' | 'preorder';
    readonly availability_description: string;
    readonly condition: 'New' | 'Used' | 'Refurbished';
    readonly is_condition_shown: boolean;
    readonly order_quantity_minimum: number;
    readonly order_quantity_maximum: number;
    readonly view_count: number;
    readonly preorder_release_date: string | null;
    readonly preorder_message: string;
    readonly is_preorder_only: boolean;
    readonly is_price_hidden: boolean;
    readonly price_hidden_label: string;
    readonly custom_url: {
        readonly url?: string;
        readonly is_customized?: boolean;
        readonly create_redirect?: boolean;
    };
    readonly base_variant_id: number;
    readonly open_graph_type:
        | 'product'
        | 'album'
        | 'book'
        | 'drink'
        | 'food'
        | 'game'
        | 'movie'
        | 'song'
        | 'tv_show';
    readonly open_graph_title: string;
    readonly open_graph_description: string;
    readonly open_graph_use_meta_description: boolean;
    readonly open_graph_use_product_name: boolean;
    readonly open_graph_use_image: boolean;
    readonly images: ReadonlyArray<{
        readonly is_thumbnail?: boolean;
        readonly sort_order?: number;
        readonly description?: string;
        readonly date_modified?: string;
        readonly id?: number;
        readonly product_id?: number;
        readonly image_url?: string;
        readonly url_zoom?: string;
        readonly url_standard?: string;
        readonly url_thumbnail?: string;
        readonly url_tiny?: string;
    }>;
    readonly primary_image: {
        readonly id?: number;
        readonly product_id?: number;
        readonly is_thumbnail?: boolean;
        readonly sort_order?: number;
        readonly description?: string;
        readonly image_file?: string;
        readonly url_zoom?: string;
        readonly url_standard?: string;
        readonly url_thumbnail?: string;
        readonly url_tiny?: string;
        readonly date_modified?: string;
    };
    readonly gift_wrapping_options_type: 'any' | 'none' | 'list';
    readonly gift_wrapping_options_list: readonly number[];
};
