import { Client, expectType } from '../../index.test-d.js';

export default (client: Client) => {
    client.v3
        .get('/catalog/products/{product_id}', {
            path: {
                product_id: 1234,
            },
            query: {
                include: ['reviews'],
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
} | null;
