# Aligent BigCommerce API Client

A JavaScript client for BigCommerce's [Management](src/management/README.md) API with full TypeScript typings for all API endpoints.

## Features

- Full coverage and Typescript typing for BigCommerce's Management REST APIs
- Easy IDE autocompeletion of endpoints, parameters and response data
- Automatic retry of intermittent errors such as 429 and 5xx with exponential backoff

## Supported environments

- Node.js >=18

# Getting started

To get started with the JavaScript client you'll need to install it, and then follow the instructions for either the Storefront API client or the Management API client.

- [Installation](#installation)
- [Getting started with the Management API client](src/management/README.md#getting-started)

## Installation

### Node

```sh
npm install @aligent/bigcommerce-api
```

## Notes on the source schemas

Management REST API schemas are taken from the BigCommerce documentation here: https://github.com/bigcommerce/docs/tree/main/reference

### Undeclared REST methods

REST methods not declared in a schema are by default included in openapi-typescript with a value of `never`.

To improve UX and reduce complexity at compile time these methods are removed from the built types.

### Accept and Content-Type headers

Almost all requests require a value of `application/json` for these headers - the exception being methods supporting `multipart/form-data` (e.g. image uploads).

For ease of use the exported client automatically sets the appropriate headers, and the required types are instead set to optional in the exported types.

### "Empty" response codes

Some methods declare what appears to be an invalid or unnecessary additional response code with an empty object as the value for `application/json`.

These are removed from the generated Typescript types as they force users to check the response type when it should never be necessary (e.g. 201 on a GET request)

### GET customers/{customerId}/metafields and customers/{customerId}/metafields/{metafieldId}

The response payloads for these are incorrectly declared in BigCommerce's documentation and schemas: https://github.com/bigcommerce/docs/issues/912

The generated types for these endpoints are currently incorrect as a result.

### catalog/products/{product_id}/images and catalog/products/{product_id}/images/{imageId}

The documentation site pulls the schema for these endpoints from a different source.

### Migration from @space48/bigcommerce-api

This library was built on the groundwork laid by the `@space48/bigcommerce-api` library (https://github.com/Space48/bigcommerce-api-js/).

BigCommerce have changed their published schemas substantially since the last time that library was built. If you are migrating, please check [docs/CHANGED_PATHS.md](./docs/CHANGED_PATHS.md).

> [!WARNING]
>
> There may be other changes to query, path, and response variables. Migration may require additional changes to your code.

## Versioning

This project strictly follows [Semantic Versioning](http://semver.org/).

New versions may include changes pulled from the BigCommerce source schemas. Look in [docs/changelog](./docs//changelog/) for any resulting changes to interfaces.

## Support

If you have a problem with this library, please file an [issue](https://github.com/aligent/bigcommerce-api/issues/new) here on GitHub.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

MIT

## Under development

- [x] Easier customisation of fetch client
- [ ] Expose the storefront API paths properly
- [ ] Regular rebuild and publish schedule to keep up with BigCommerce API schema changes
- [ ] Migrate generation code to Typescript
- [x] Properly publish ESM and CJS exports
- [ ] Audit eslint/typescript ignore comments
- [ ] Audit type narrowing and parameter types (especially in v2)
