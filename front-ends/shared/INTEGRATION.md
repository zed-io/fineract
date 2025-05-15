# Fineract Shared Library Integration Guide

This guide explains how to integrate the shared library into both the Angular web-app and the Next.js credit-cloud-admin applications.

## Prerequisites

Before integrating the shared library, ensure that:

1. The library has been built (`npm run build` from the shared directory)
2. You have access to both front-end applications

## Integrating with Angular (web-app)

### 1. Update Angular Module Configuration

First, you need to configure the Angular application to use the shared library. Add the following to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@fineract/shared/*": ["../shared/*"]
    }
  }
}
```

### 2. Import Angular Module

Create a module to import all shared Angular components:

```typescript
// src/app/shared/fineract-shared.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AngularButton } from '../../../shared/angular/components/AngularButton';
// Import other Angular components as needed

@NgModule({
  declarations: [
    // List all imported components
    AngularButton
  ],
  imports: [
    CommonModule
  ],
  exports: [
    // Export all components for use in other modules
    AngularButton
  ]
})
export class FineractSharedModule { }
```

### 3. Import the Module in Your App

Import the shared module in your main app module or feature modules:

```typescript
// src/app/app.module.ts
import { NgModule } from '@angular/core';
import { FineractSharedModule } from './shared/fineract-shared.module';

@NgModule({
  imports: [
    // ...other modules
    FineractSharedModule
  ],
  // ...
})
export class AppModule { }
```

### 4. Use Shared Utilities

For utility functions, import them directly in your components:

```typescript
// Example component
import { Component } from '@angular/core';
import { formatCurrency } from '../../../shared/utils/currency/format';

@Component({
  selector: 'app-example',
  template: `<div>{{ formattedAmount }}</div>`
})
export class ExampleComponent {
  formattedAmount = formatCurrency(1234.56, 'USD');
}
```

### 5. Use Shared Components

Now you can use the shared components in your templates:

```html
<app-button
  label="Submit"
  variant="primary"
  [loading]="isLoading"
  (onClick)="handleSubmit()"
></app-button>
```

## Integrating with Next.js (credit-cloud-admin)

### 1. Update Next.js Configuration

Configure Next.js to include the shared library in its build. Add the following to your `next.config.js`:

```javascript
const path = require('path');

module.exports = {
  // ...other config
  webpack(config, options) {
    config.resolve.alias['@fineract/shared'] = path.join(__dirname, '../shared');
    
    // Return the modified config
    return config;
  },
};
```

### 2. Update TypeScript Configuration

Add paths to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@fineract/shared/*": ["../shared/*"]
    }
  }
}
```

### 3. Create Component Wrappers (Optional)

You might want to create component wrappers that adapt the shared React components to your application's design system:

```tsx
// src/components/ui/Button.tsx
import { ReactButton, ReactButtonProps } from '@fineract/shared/react/components/ReactButton';

export type ButtonProps = ReactButtonProps;

export const Button: React.FC<ButtonProps> = (props) => {
  // You can customize the base component here
  return <ReactButton {...props} />;
};

export default Button;
```

### 4. Use Shared Components

Import and use the components in your React components:

```tsx
// Using direct import
import { ReactButton } from '@fineract/shared/react/components/ReactButton';

// Or using your wrapper
import { Button } from '@/components/ui/Button';

function MyComponent() {
  return (
    <Button
      label="Submit"
      variant="primary"
      loading={isLoading}
      onClick={handleSubmit}
    />
  );
}
```

### 5. Use Shared Utilities

Import utility functions directly:

```tsx
import { formatCurrency } from '@fineract/shared/utils/currency/format';
import { formatDate } from '@fineract/shared/utils/date/format';

function MyComponent() {
  const amount = formatCurrency(1234.56, 'USD');
  const date = formatDate(new Date(), 'MMM dd, yyyy');
  
  return (
    <div>
      <p>Amount: {amount}</p>
      <p>Date: {date}</p>
    </div>
  );
}
```

## Setting Up a Development Workflow

For ongoing development, it's helpful to set up a workflow that allows changes to the shared library to be immediately reflected in both applications.

### Option 1: Using Symbolic Links

You can use symbolic links to directly reference the shared library:

```bash
# From the web-app directory
npm link ../shared

# From the credit-cloud-admin directory
npm link ../shared
```

### Option 2: Watch Mode

Run the shared library in watch mode:

```bash
# From the shared directory
npm run dev
```

This will rebuild the library whenever changes are made, and your applications can import the latest version.

### Option 3: Monorepo Setup

Consider using a monorepo tool like Lerna or Nx to manage the relationship between the library and the applications. This would handle builds, dependencies, and versioning in a more automated way.

## Using Environment-Specific Configuration

Sometimes you need different behavior depending on the environment. You can create environment-specific adapters:

```typescript
// shared/utils/environment.ts
export interface Environment {
  production: boolean;
  apiUrl: string;
  // Add other environment properties
}

// In each application, create an environment provider
// web-app/src/app/environment-provider.ts
import { Environment } from '@fineract/shared/utils/environment';

export const environment: Environment = {
  production: true,
  apiUrl: 'https://api.example.com',
};
```

Then use this environment object in your shared code when needed.

## Testing Integration

After integration, test both applications thoroughly to ensure that:

1. Components render correctly
2. Utility functions work as expected
3. Events and data flow properly between shared components and application code
4. Styles are applied correctly
5. Bundle sizes are reasonable

## Troubleshooting

### Common Issues

1. **Module not found errors**: Check that paths are configured correctly in both applications.

2. **Type errors**: Ensure TypeScript configurations are compatible between the library and applications.

3. **Style conflicts**: If your components have style conflicts, use more specific selectors or scoped styles.

4. **Build errors**: Make sure all dependencies required by the shared library are also installed in the applications.

### Solutions

- Check import paths (use absolute paths starting with `@fineract/shared/`)
- Restart development servers after changes to configuration
- Clear node_modules and reinstall dependencies if necessary
- Run `npm run build` in the shared library to ensure it's properly built

## Best Practices

1. **Keep shared code framework-agnostic**: Try to put as much logic as possible in the core utilities and types.

2. **Minimize framework-specific code**: Only create framework-specific implementations when necessary.

3. **Clear documentation**: Document all components and utilities in the shared library.

4. **Consistent naming**: Use consistent naming conventions across the library.

5. **Versioning**: Consider versioning the shared library for better dependency management.

6. **Test coverage**: Maintain high test coverage for shared components and utilities.