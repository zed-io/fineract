# Apache Fineract Front-end Applications

This directory contains the front-end applications for Apache Fineract.

## Applications

### Web App (Angular)

The traditional web application built with Angular, located in `web-app/`.

### Credit Cloud Admin (Next.js)

A modern admin interface built with Next.js, located in `credit-cloud-admin/`.

## Shared Libraries

### Shared Utilities

A framework-agnostic utility library used by both applications, located in `shared-utils/`.

The shared utilities library provides common functionality for:
- Currency formatting and parsing
- Date handling for financial applications
- Financial mathematics calculations
- Number formatting and validation
- Common validation functions

See the [Shared Utils README](./shared-utils/README.md) for more information.

## Integration Strategy

Both front-end applications use the shared utilities library to ensure consistent handling of:
- Currency formatting
- Date formatting and manipulation
- Financial calculations
- Form validation

## Getting Started

To build and use the shared utilities library:

```bash
# Navigate to the shared-utils directory
cd shared-utils

# Install dependencies
npm install

# Build the library
npm run build

# Link to local applications
npm link
cd ../web-app
npm link @fineract/shared-utils
cd ../credit-cloud-admin
npm link @fineract/shared-utils
```

## Development

When making changes to the shared utilities library, rebuild it before testing in the applications:

```bash
cd shared-utils
npm run build
```

## Testing

Each application has its own testing setup. The shared utility library uses Jest for testing.

```bash
cd shared-utils
npm test
```