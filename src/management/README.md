# BigCommerce Management API client

A JavaScript client for BigCommerce's Management API with full TypeScript typings for all API endpoints.

# Getting started

To get started with the Management API client you'll need to install it, and then get credentials which will allow you to read and write data in your BigCommerce store.

- [Installation](#installation)
- [Authentication](#authentication)
- [Using ES6 import](#using-es6-import)
- [Your first request](#your-first-request)
- [How-to guides](#how-to-guides)
- [References](#references)

## Installation

### Node:

```sh
npm install @aligent/bigcommerce-api
```

## Authentication

To use the BigCommerce Management API you first need to [obtain the store hash and an access token](https://developer.bigcommerce.com/api-docs/getting-started/authentication/rest-api-authentication#obtaining-store-api-credentials) from your BigCommerce store's control panel.

## Using ES6 import

You can use es6 imports with the Management API:

```js
import { Management } from '@aligent/bigcommerce-api';

const bigCommerce = new Management.Client({
  storeHash: 'your store hash here',
  accessToken: 'your access token here',
});
```

## Your first request

The following code snippet will fetch store information from the V2 API and dump it to the console:

```js
import { Management } from '@aligent/bigcommerce-api';

const bigCommerce = new Management.Client({
  storeHash: 'your store hash here',
  accessToken: 'your access token here',
});

bigCommerce.v2.get('/store').then(console.dir);
```

## How-to guides

Start by instantiating a client instance:

```js
import { Management } from '@aligent/bigcommerce-api';

const bigCommerce = new Management.Client({
  storeHash: 'your store hash here',
  accessToken: 'your access token here',
});
```

### How to send a GET request with no params

```js
bigCommerce.v2.get('/store').then(
  storeInfo => { // 200 -> response.body; 204, 404 -> null
    console.dir(storeInfo),
  }
  error => { // non-2xx, non-404
    console.error(error);
  },
);
```

> Note: When using the V3 client, `get()`, `post()`, `put()` and `delete()` return response.body.data on success whereas the equivalent V2 methods return response.body. If you require access to response.body.meta when sending a V3 request you should use the `Management.v3.send()` method.

### How to send a GET request with params

```js
bigCommerce.v3.get('/catalog/products/{product_id}', {
  path: { product_id: 1234 },
  query: { include: ['images'] }
}).then(
  product => { // 200 -> response.body.data; 204, 404 -> null
    console.dir(product),
  }
  error => { // non-2xx, non-404
    console.error(error);
  },
)
```

> Note: When using the V3 client, `get()`, `post()`, `put()` and `delete()` return response.body.data on success whereas the equivalent V2 methods return response.body. If you require access to response.body.meta when sending a V3 request you should use the `Management.v3.send()` method.

### How to retrieve all items from a paginated v3 endpoint

```js
async function printAllProducts() {
  // list() sends one HTTP request at a time and only sends requests as the iterator is consumed
  const products = bigCommerce.v3.list('/catalog/products', { query: { include: ['images'] } });
  for await (const product of products) {
    console.dir(product);
  }
}
```

> Note: `list()` is currently only available for V3 endpoints as the V2 API does not apply a standardised approach to pagination.

### How to send a request with a body

```js
bigCommerce.v3.post('/customers', {
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
}).then(
  result => { // 200 -> response.body.data; 204 -> null
    console.dir(result),
  }
  error => { // non-2xx
    console.error(error);
  },
)
```

### How to send a request with form data

```js
const buffer = readFileSync('path/to/image', { encoding: 'base64' });
const formData = new FormData();
formData.append('image_file', buffer);
bigCommerce.v3.post('/catalog/products/{product_id}/variants/{variant_id}/image', {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
  path: {
    product_id: 123,
    variant_id: 123,
  },
  body: formData,
}).then(
  result => { // 200 -> response.body.data; 204 -> null
    console.dir(result),
  }
)
```

> Note: BigCommerce API specs list Accept: application/json as a required header for all requests. For convenience this library sets that automatically on all requests except when Content-Type: multipart/form is specified

> Note: When using the V3 client, `get()`, `post()`, `put()` and `delete()` return response.body.data on success whereas the equivalent V2 methods return response.body. If you require access to response.body.meta when sending a V3 request you should use the `Management.v3.send()` method.

## References

### Configuration

The `Client` constructor supports several options you may set to achieve the expected behavior:

```js
import { Management } from "@aligent/bigcommerce-api";

const bigCommerce = new Management.Client({
  ... your config here ...
});
```

#### storeHash (required)

Your BigCommerce store hash.

#### accessToken (required)

Your BigCommerce Management API access token.

#### agent (optional; node runtime only)

Provide a node HTTP agent to override things like keepalive and connection pool size.

### Overriding the internal client

You can provide your own fetch implementation to the clients.

For light modifications like custom headers or baseUrl, re-use the `fetchTransport` function

```typescript
const v2 = new Management.V2.Client(
  import { Management, fetchTransport } from "@aligent/bigcommerce-api";
  import { Agent } from "node:http";

  fetchTransport({
    baseUrl: 'http://custom.url/v2',
    headers: {
      "customer-header": "..."
    }
  })
);

const v3 = new Management.V3.Client(
  fetchTransport({
    baseUrl: 'http://custom.url/v3',
    headers: {
      "customer-header": "..."
    }
  })
);
```

For more control, provide a custom implementation matching the Transport interface to the clients

```typescript
type Transport = (requestLine: string, params?: Parameters) => Promise<Response>;
```

### V2 API client

See the [V2 readme](v2/README.md) for more detail on the Management V2 client methods.

### V3 API client

See the [V3 readme](v3/README.md) for more detail on the Management V3 client methods.

### REST API reference

This library is a wrapper around BigCommerce's REST API. Visit the [BigCommerce API reference](https://developer.bigcommerce.com/api-reference) to see detailed documentation of the available endpoints and parameters.
