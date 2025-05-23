/**
 * This file was auto-generated by openapi-typescript and ts-morph.
 * Do not make direct changes to the file.
 */

export interface paths {
    readonly "/storefront/custom-template-associations": {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description The [MIME type](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types) of the response body. */
                readonly Accept: components["parameters"]["Accept"];
            };
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get Custom Template Associations
         * @description Get a collection of the storeʼs custom template associations across all storefronts.
         */
        readonly get: operations["getCustomTemplateAssociations"];
        /**
         * Upsert Custom Template Associations
         * @description Upsert new custom template associations data across all storefronts. If an existing record is found for the combination of channel ID, entity ID, and type, the existing record will be overwritten with the new template.
         */
        readonly put: operations["upsertCustomTemplateAssociations"];
        /**
         * Delete Custom Template Associations
         * @description Delete custom template associations. At least one query parameter must be used.
         */
        readonly delete: operations["deleteCustomTemplateAssociations"];
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        readonly Error: {
            readonly status?: number;
            readonly message?: string;
        };
        readonly ErrorResponse400: {
            readonly schema?: components["schemas"]["Error"];
        };
        readonly ErrorResponse404: {
            readonly schema?: components["schemas"]["Error"];
        };
        readonly ErrorResponse409: {
            readonly schema?: components["schemas"]["Error"];
        };
        readonly ErrorResponse422: {
            readonly schema?: components["schemas"]["Error"];
        };
        readonly MetaPaginationObject: {
            readonly pagination?: {
                /** @example 246 */
                readonly total?: number;
                /** @example 5 */
                readonly count?: number;
                /** @example 5 */
                readonly per_page?: number;
                /** @example 1 */
                readonly current_page?: number;
                /** @example 50 */
                readonly total_pages?: number;
                readonly links?: {
                    /** @example ?limit=5&page=2 */
                    readonly next?: string;
                    /** @example ?limit=5&page=1 */
                    readonly current?: string;
                };
            };
        };
        readonly DetailedErrors: {
            readonly [key: string]: string;
        };
        /** @description Error payload for the BigCommerce API.
         *      */
        readonly BaseError: {
            /** @description The HTTP status code.
             *      */
            readonly status?: number;
            /** @description The error title describing the particular error.
             *      */
            readonly title?: string;
            readonly type?: string;
            readonly instance?: string;
        };
        readonly ErrorResponse: components["schemas"]["BaseError"] & {
            readonly errors?: components["schemas"]["DetailedErrors"];
        };
        /** CustomTemplateAssociation */
        readonly CustomTemplateAssociation: {
            readonly id?: number;
            readonly channel_id?: number;
            /** @enum {string} */
            readonly entity_type?: "product" | "category" | "brand" | "page";
            readonly entity_id?: number;
            /** @example custom-product-1.html */
            readonly file_name?: string;
            /** @description An invalid file name does not match with an existing custom layout file in the currently active theme for the channel. When an association is invalid the store will fallback to using the default for that entity type. */
            readonly is_valid?: boolean;
            readonly date_created?: string;
            readonly date_modified?: string;
        };
        /** CustomTemplateAssociation */
        readonly CustomTemplateAssociationUpsert: {
            readonly channel_id: number;
            /** @enum {string} */
            readonly entity_type: "product" | "category" | "brand" | "page";
            readonly entity_id: number;
            readonly file_name: string;
        };
    };
    responses: never;
    parameters: {
        /** @description The [MIME type](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types) of the response body. */
        readonly Accept: string;
        /** @description The [MIME type](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types) of the request body. */
        readonly ContentType: string;
        /** @description A comma-separated string that specifies a list of association IDs to delete. */
        readonly IdInQuery: readonly number[];
        /** @description Return results or act upon only template associations in the specified channel. */
        readonly ChannelIdQuery: number;
        /** @description A comma-separated list of entity IDs to return or act upon. Must be used together with the `type` filter. Currently, all supported entities have integer-type IDs.  */
        readonly EntityIdInQuery: readonly number[];
        /** @description Filter associations by type. */
        readonly TypeQuery: "product" | "category" | "brand" | "page";
        /** @description Number of results to return per page. */
        readonly LimitQuery: number;
        /** @description Which page number to return, based on the limit value. Used to paginate large collections. */
        readonly PageQuery: number;
        /** @description Optional toggle to filter for exclusively valid or invalid associations entries. An invalid entry is one where its file name does not match up to an existing custom layout file in the currently active theme for the channel. */
        readonly IsValidQuery: boolean;
    };
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    readonly getCustomTemplateAssociations: {
        readonly parameters: {
            readonly query?: {
                /** @description Return results or act upon only template associations in the specified channel. */
                readonly channel_id?: components["parameters"]["ChannelIdQuery"];
                /** @description A comma-separated list of entity IDs to return or act upon. Must be used together with the `type` filter. Currently, all supported entities have integer-type IDs.  */
                readonly "entity_id:in"?: components["parameters"]["EntityIdInQuery"];
                /** @description Filter associations by type. */
                readonly type?: components["parameters"]["TypeQuery"];
                /** @description Number of results to return per page. */
                readonly limit?: components["parameters"]["LimitQuery"];
                /** @description Which page number to return, based on the limit value. Used to paginate large collections. */
                readonly page?: components["parameters"]["PageQuery"];
                /** @description Optional toggle to filter for exclusively valid or invalid associations entries. An invalid entry is one where its file name does not match up to an existing custom layout file in the currently active theme for the channel. */
                readonly is_valid?: components["parameters"]["IsValidQuery"];
            };
            readonly header?: {
                /** @description The [MIME type](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types) of the response body. */
                readonly Accept?: components["parameters"]["Accept"];
            };
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description OK */
            readonly 200: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": {
                        readonly data?: readonly components["schemas"]["CustomTemplateAssociation"][];
                        readonly meta?: components["schemas"]["MetaPaginationObject"];
                    };
                };
            };
        };
    };
    readonly upsertCustomTemplateAssociations: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: {
                /** @description The [MIME type](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types) of the response body. */
                readonly Accept?: components["parameters"]["Accept"];
                /** @description The [MIME type](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types) of the request body. */
                readonly "Content-Type"?: components["parameters"]["ContentType"];
            };
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: {
            readonly content: {
                readonly "application/json": readonly components["schemas"]["CustomTemplateAssociationUpsert"][];
            };
        };
        readonly responses: {
            /** @description Success response for batch upsert of custom template associations */
            readonly 200: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": {
                        readonly [key: string]: unknown;
                    };
                };
            };
            /** @description Error response for batch PUT of Custom template associations. Includes the errors for each reference ID. */
            readonly 422: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    readonly deleteCustomTemplateAssociations: {
        readonly parameters: {
            readonly query?: {
                /** @description A comma-separated string that specifies a list of association IDs to delete. */
                readonly "id:in"?: components["parameters"]["IdInQuery"];
                /** @description Return results or act upon only template associations in the specified channel. */
                readonly channel_id?: components["parameters"]["ChannelIdQuery"];
                /** @description Filter associations by type. */
                readonly type?: components["parameters"]["TypeQuery"];
                /** @description A comma-separated list of entity IDs to return or act upon. Must be used together with the `type` filter. Currently, all supported entities have integer-type IDs.  */
                readonly "entity_id:in"?: components["parameters"]["EntityIdInQuery"];
            };
            readonly header?: {
                /** @description The [MIME type](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types) of the response body. */
                readonly Accept?: components["parameters"]["Accept"];
            };
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description No Content */
            readonly 204: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
}
