# Fineract Frontend Implementation Guide

This guide outlines the recommended approach for establishing a convention layer between Hasura GraphQL types and TypeScript frontend for the Fineract project.

## Table of Contents

1. [GraphQL CodeGen Setup](#graphql-codegen-setup)
2. [Folder Structure](#folder-structure)
3. [Type Mapping Strategy](#type-mapping-strategy)
4. [Component Templates](#component-templates)
5. [Form State Management](#form-state-management)
6. [Development Workflow](#development-workflow)

## GraphQL CodeGen Setup

We use GraphQL Code Generator to automatically generate TypeScript types from your Hasura GraphQL schema. This ensures type safety and autocompletion.

### Installation

```bash
npm install --save-dev @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-operations @graphql-codegen/typescript-react-apollo @graphql-codegen/fragment-matcher @graphql-codegen/schema-ast
```

### Configuration

See the `codegen.yml` file for the complete configuration. Key features:

- Generates React hooks for all operations
- Maps GraphQL scalars to TypeScript types
- Produces schema.graphql for documentation
- Creates fragment matcher for Apollo Client

### Running Code Generation

```bash
npm run codegen
```

## Folder Structure

We recommend organizing your GraphQL operations by domain and type:

```
src/graphql/
├── fragments/    # Reusable fragments
├── mutations/    # Mutation operations
├── queries/      # Query operations
└── subscriptions/ (if needed)
```

See the `folder-structure.md` file for a complete recommended structure.

## Type Mapping Strategy

Hasura and your frontend may have type mismatches. We've provided utilities to handle these:

- String vs. Int IDs
- UUID handling
- Date formatting
- JSON parsing
- Enum mapping

See the `type-mapping.ts` file for implementation details.

### Common Type Issues and Solutions

1. **ID Types**: Hasura often returns string IDs whereas your database might use integers
   ```typescript
   // Convert string IDs to numbers when displaying data
   const numericId = stringToNumberId(client.id);
   
   // Convert back to strings when sending to API
   const stringId = numberToStringId(numericId);
   ```

2. **Date Handling**: Format dates correctly for API requests
   ```typescript
   // Parse dates from API
   const birthDate = parseAPIDate(client.dateOfBirth);
   
   // Format dates for API
   const formattedDate = formatDateForAPI(selectedDate);
   ```

3. **UUID Validation**: Ensure UUIDs are properly formatted
   ```typescript
   try {
     const validUUID = ensureUUID(inputUUID);
     // proceed with valid UUID
   } catch (error) {
     // handle invalid UUID
   }
   ```

## Component Templates

We've provided example component templates that integrate with the generated types:

- ClientForm component shows how to create a form using generated types
- LoanApplicationFragment demonstrates how to structure GraphQL fragments
- ClientListQuery shows how to query data with filters

These templates follow best practices:

- Type-safe props and state
- Integration with react-hook-form for form management
- Error handling and loading states
- Consistent styling with Material UI

## Form State Management

Our form state management approach uses:

- react-hook-form for form state
- yup for validation
- Custom hooks for GraphQL integration

Key patterns:

1. **FormContainer**: Type-safe form wrapper with validation
2. **Field Components**: Reusable field components that connect to form context
3. **Mutation Adapters**: Utilities to map form data to mutation variables
4. **Form Initialization**: Utilities to initialize forms from query data

See the `form-state-management.tsx` file for implementation details.

## Development Workflow

1. Define GraphQL operations (queries, mutations, fragments) in `.graphql` files
2. Run code generation to create TypeScript types
3. Create components using generated hooks and types
4. Use type mapping utilities to handle any type mismatches
5. Implement form state management using the provided patterns

## Additional Resources

- [GraphQL Code Generator Documentation](https://www.graphql-code-generator.com/)
- [React Hook Form Documentation](https://react-hook-form.com/)
- [Apollo Client Documentation](https://www.apollographql.com/docs/react/)
- [Yup Validation Documentation](https://github.com/jquense/yup)