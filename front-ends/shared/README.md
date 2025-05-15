# Fineract Shared Component Library

This is a shared component and utility library for Fineract front-end applications. It provides a set of core components, utilities, and framework-specific implementations that can be used across both the Angular web-app and the Next.js credit-cloud-admin applications.

## Library Structure

```
/shared
  /core                # Framework-agnostic core components, types, and interfaces
    /components        # Core component definitions
    /types             # Shared type definitions
  
  /utils               # Shared utility functions
    /date              # Date formatting and manipulation utilities
    /currency          # Currency formatting and calculation utilities
    /validation        # Form validation utilities
    /formatting        # Text and number formatting utilities
  
  /react              # React-specific components and hooks
    /components       # React component implementations
    /hooks            # React hooks
  
  /angular            # Angular-specific components and services
    /components       # Angular component implementations
    /services         # Angular services
```

## Installation

### Inside Fineract Monorepo

The library is included in the Fineract monorepo and can be used directly by the front-end applications within the monorepo.

### For External Use

You can also package this library for use in external projects:

```bash
# From the shared directory
npm install
npm run build
```

## Usage

### In Angular (web-app)

1. Import the desired Angular component in your module:

```typescript
import { AngularButton } from '@fineract/shared/angular';

@NgModule({
  declarations: [
    // ...
    AngularButton
  ],
  // ...
})
export class YourModule { }
```

2. Use the component in your templates:

```html
<app-button
  label="Submit"
  variant="primary"
  [loading]="isLoading"
  (onClick)="handleSubmit()"
></app-button>
```

3. Import and use utility functions:

```typescript
import { formatCurrency } from '@fineract/shared/utils/currency';
import { formatDate } from '@fineract/shared/utils/date';

@Component({
  // ...
})
export class YourComponent {
  formattedAmount = formatCurrency(1234.56, 'USD');
  formattedDate = formatDate(new Date(), 'MMM dd, yyyy');
}
```

### In React (credit-cloud-admin)

1. Import the desired React component:

```tsx
import { ReactButton } from '@fineract/shared/react';

function YourComponent() {
  return (
    <ReactButton
      label="Submit"
      variant="primary"
      loading={isLoading}
      onClick={handleSubmit}
    />
  );
}
```

2. Import and use utility functions:

```tsx
import { formatCurrency } from '@fineract/shared/utils/currency';
import { formatDate } from '@fineract/shared/utils/date';

function YourComponent() {
  const formattedAmount = formatCurrency(1234.56, 'USD');
  const formattedDate = formatDate(new Date(), 'MMM dd, yyyy');
  
  return (
    <div>
      <p>Amount: {formattedAmount}</p>
      <p>Date: {formattedDate}</p>
    </div>
  );
}
```

## Core Components

### Button

A customizable button component with various styles and states.

```tsx
// React usage
<ReactButton
  label="Submit"
  variant="primary"
  size="medium"
  loading={isLoading}
  disabled={!isValid}
  onClick={handleSubmit}
/>
```

```html
<!-- Angular usage -->
<app-button
  label="Submit"
  variant="primary"
  size="medium"
  [loading]="isLoading"
  [disabled]="!isValid"
  (onClick)="handleSubmit()"
></app-button>
```

### DataTable

A feature-rich data table component for displaying tabular data.

```tsx
// React usage
<ReactDataTable
  columns={columns}
  data={users}
  pagination={{
    page: 1,
    pageSize: 10,
    totalItems: 100
  }}
  onPaginationChange={handlePaginationChange}
  onSortChange={handleSortChange}
/>
```

```html
<!-- Angular usage -->
<app-data-table
  [columns]="columns"
  [data]="users"
  [pagination]="pagination"
  (onPaginationChange)="handlePaginationChange($event)"
  (onSortChange)="handleSortChange($event)"
></app-data-table>
```

### Modal

A flexible modal dialog component.

```tsx
// React usage
<ReactModal
  isOpen={isModalOpen}
  onClose={closeModal}
  title="Create User"
  primaryButtonText="Save"
  onPrimaryButtonClick={handleSave}
  secondaryButtonText="Cancel"
  onSecondaryButtonClick={closeModal}
>
  <div>Modal content</div>
</ReactModal>
```

```html
<!-- Angular usage -->
<app-modal
  [isOpen]="isModalOpen"
  (onClose)="closeModal()"
  title="Create User"
  primaryButtonText="Save"
  (onPrimaryButtonClick)="handleSave()"
  secondaryButtonText="Cancel"
  (onSecondaryButtonClick)="closeModal()"
>
  <div>Modal content</div>
</app-modal>
```

## Utility Functions

### Date Utilities

```typescript
import {
  formatDate,
  formatRelativeDate,
  formatDateRange,
  parseDate,
  calculateDateDifference
} from '@fineract/shared/utils/date';

// Format a date
const formattedDate = formatDate(new Date(), 'MMM dd, yyyy'); // "Jan 01, 2023"

// Format a relative date
const relativeDate = formatRelativeDate(new Date('2023-01-01')); // "2 months ago"

// Calculate date difference
const daysBetween = calculateDateDifference(
  new Date('2023-01-01'),
  new Date('2023-01-15'),
  'days'
); // 14
```

### Currency Utilities

```typescript
import {
  formatCurrency,
  formatAmount,
  calculateEMI,
  calculateAmortizationSchedule
} from '@fineract/shared/utils/currency';

// Format currency
const formattedCurrency = formatCurrency(1234.56, 'USD'); // "$1,234.56"

// Calculate loan EMI
const monthlyPayment = calculateEMI(100000, 5, 60); // 1887.12 (principal, interest rate, term in months)

// Get amortization schedule
const schedule = calculateAmortizationSchedule(100000, 5, 60);
```

### Validation Utilities

```typescript
import {
  isValidEmail,
  isValidPhone,
  validatePassword,
  isValidInterestRate
} from '@fineract/shared/utils/validation';

// Validate email
const isEmailValid = isValidEmail('user@example.com'); // true

// Validate phone number
const isPhoneValid = isValidPhone('555-123-4567'); // true

// Validate password strength
const passwordCheck = validatePassword('Password123!');
if (!passwordCheck.isValid) {
  console.log(passwordCheck.reasons); // Array of validation failures
}
```

### Formatting Utilities

```typescript
import {
  capitalizeFirstLetter,
  toTitleCase,
  truncateString,
  formatPhoneNumber
} from '@fineract/shared/utils/formatting';

// Capitalize first letter
const capitalized = capitalizeFirstLetter('hello world'); // "Hello world"

// Convert to title case
const titleCased = toTitleCase('hello world'); // "Hello World"

// Truncate string
const truncated = truncateString('This is a long text that needs truncation', 20); // "This is a long text..."

// Format phone number
const formattedPhone = formatPhoneNumber('5551234567', 'US'); // "(555) 123-4567"
```

## Contributing

When adding new components or utilities to the shared library:

1. Create core interfaces and types in the `/core` directory
2. Implement framework-specific versions in the appropriate directory
3. Export everything through the index files
4. Add appropriate documentation
5. Add tests for new functionality

## Building the Library

```bash
# From the shared directory
npm run build        # Build the library
npm run test         # Run tests
npm run lint         # Lint the code
```