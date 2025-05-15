# Fineract Shared Utilities

A collection of shared utility functions for Fineract front-end applications, designed to work with both Angular and React-based applications.

## Features

- Currency formatting and parsing
- Date utilities for financial applications
- Financial mathematics functions
- Number formatting for percentages, ratios, etc.
- Validation utilities for financial data

## Installation

```bash
# From the project root
cd front-ends/shared-utils
npm install
npm run build
```

## Usage

### In the Angular web-app

Add the library to your dependencies in `package.json`:

```json
{
  "dependencies": {
    "@fineract/shared-utils": "file:../shared-utils"
  }
}
```

Then import and use the utilities:

```typescript
import { formatCurrency, formatDate } from '@fineract/shared-utils';

// Format a currency amount
const formattedAmount = formatCurrency(1234.56, { code: 'USD' });

// Format a date
const formattedDate = formatDate(new Date(), { format: 'YYYY-MM-DD' });
```

### In the Next.js credit-cloud-admin

Add the library to your dependencies in `package.json`:

```json
{
  "dependencies": {
    "@fineract/shared-utils": "file:../shared-utils"
  }
}
```

Then import and use the utilities:

```typescript
import { formatCurrency, formatDate } from '@fineract/shared-utils';

// Format a currency amount
const formattedAmount = formatCurrency(1234.56, { code: 'USD' });

// Format a date
const formattedDate = formatDate(new Date(), { format: 'YYYY-MM-DD' });
```

## Modules

### Currency

Utilities for formatting and parsing currency values:

- `formatCurrency` - Format a number as a currency string
- `parseCurrency` - Parse a currency string into a Decimal
- `convertCurrency` - Calculate exchange rate conversion

### Date

Utilities for working with dates in financial applications:

- `formatDate` - Format a date using specified options
- `parseDate` - Parse a date string using a specified format
- `dateDiff` - Calculate the difference between two dates
- `addToDate` - Add a specified amount of time to a date
- `subtractFromDate` - Subtract a specified amount of time from a date
- `isDateInRange` - Check if a date is within a specific range
- `getBusinessDays` - Calculate the number of business days between two dates
- `addBusinessDays` - Calculate the end date after adding business days

### Math

Financial mathematics utilities:

- `round` - Round a number to a specified number of decimal places
- `calculateSimpleInterest` - Calculate simple interest
- `calculateCompoundInterest` - Calculate compound interest
- `calculatePresentValue` - Calculate the present value of a future amount
- `calculateIRR` - Calculate the internal rate of return
- `calculateNPV` - Calculate the net present value
- `calculatePayment` - Calculate the payment for a loan or annuity
- `calculateRemainingBalance` - Calculate the remaining balance of a loan
- `calculateEffectiveRate` - Calculate the effective annual rate
- `calculateFutureValue` - Calculate the future value of an investment
- `calculateAnnuityFutureValue` - Calculate the future value of an annuity

### Number

Utilities for formatting and parsing numbers:

- `formatNumber` - Format a number according to specified options
- `formatPercentage` - Format a number as a percentage
- `formatRatio` - Format a ratio (e.g. 0.75 as "3:4")
- `parseNumber` - Parse a number from a formatted string
- `formatFileSize` - Convert a number to a human-readable file size
- `formatNumberForGrid` - Format a number for display in a table or grid

### Validation

Utilities for validating financial data:

- `isNumber` - Check if a value is a number
- `isPositiveNumber` - Check if a value is a positive number
- `isValidPercentage` - Check if a value is a valid percentage
- `isValidDecimal` - Check if a value is a valid decimal
- `isValidCurrencyAmount` - Check if a value is a valid currency amount
- `isValidInterestRate` - Check if a value is a valid interest rate
- `isValidIBAN` - Check if a value is a valid IBAN
- `isValidEmail` - Check if a value is a valid email address
- `isValidPhoneNumber` - Check if a value is a valid phone number
- `isValidDateRange` - Check if a date is within a valid range
- `validateObject` - Validate an object against a set of validation rules
- `combineValidators` - Create a validator that combines multiple validators

## Dependencies

- dayjs - Modern date utility library
- decimal.js - Arbitrary precision decimal arithmetic library