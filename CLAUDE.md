# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Build Commands
- `npm run build` - Build the library using tshy (generates both ESM and CJS outputs)
- `npm run build:clean` - Full rebuild including reference type generation from BigCommerce schemas
- `npm run build:reference-types` - Generate TypeScript types from BigCommerce OpenAPI schemas
- `npm run build:file-list` - Generate file list for schema processing
- `npm run build:summarize-changes` - Generate changelog summary of interface changes

### Testing and Quality
- `npm test` - Run type tests using tsd
- `npm run lint` - Run ESLint on TypeScript files

### Important Notes
- Node.js version requirement: >=20 (maintenance LTS)
- The project uses Yarn 4 as package manager (`yarn install` to install dependencies)
- TypeScript configuration extends `@aligent/ts-code-standards`

## Architecture Overview

### Type Generation Pipeline
This library auto-generates TypeScript types from BigCommerce's OpenAPI schemas:

1. **Schema Sources** (`src/internal/reference/`)
   - YAML schemas are fetched from BigCommerce's official documentation repository
   - Files listed in `files.json` are processed during build
   - Blacklisted operations in `blacklist.json` are excluded

2. **Generation Process** (`src/internal/reference/generate.js`)
   - Uses `openapi-typescript` to convert YAML to TypeScript
   - Applies custom AST transformations to fix BigCommerce schema issues
   - Outputs to `src/internal/reference/generated/`
   - Groups APIs by version (v2, v3, sf)

3. **Type Augmentation** (`src/internal/augmentation.ts`)
   - Removes methods not declared in schemas
   - Makes Accept/Content-Type headers optional (handled automatically)
   - Fixes incorrect response declarations

### Client Structure

The library provides a unified client with version-specific sub-clients:

```
Management.Client
├── v2 (Management.V2.Client) - Legacy REST API
└── v3 (Management.V3.Client) - Modern REST API with pagination
```

Each versioned client provides:
- `send()` - Raw API calls with full response
- `get()`, `post()`, `put()`, `delete()` - Convenience methods returning data directly
- `list()` (v3 only) - Async iterator for paginated endpoints

### Key Architectural Decisions

1. **Transport Abstraction** (`src/internal/operation.ts`)
   - Pluggable transport layer allows custom fetch implementations
   - Built-in retry logic with exponential backoff for 429/5xx errors
   - Automatic header management

2. **Type Safety**
   - Full TypeScript coverage for all endpoints
   - Response narrowing based on status codes
   - Custom endpoint support via generic type parameter

3. **Module Structure**
   - Generated types are kept separate from hand-written code
   - Each API domain has its own generated file (e.g., `catalog/products_catalog.v3.ts`)
   - Version-specific functionality isolated in v2/v3 directories

### Working with Generated Code
- Generated files in `src/internal/reference/generated/` should not be edited manually
- To update schemas: run `npm run build:clean`
- Schema changes are tracked in `docs/changelog/`