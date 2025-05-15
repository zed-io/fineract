import { 
  // Currency utilities
  formatCurrency,
  parseCurrency,
  convertCurrency,
  
  // Date utilities
  formatDate,
  parseDate,
  dateDiff,
  addToDate,
  subtractFromDate,
  DateFormats,
  
  // Math utilities
  calculateSimpleInterest,
  calculateCompoundInterest,
  calculatePayment,
  calculateRemainingBalance,
  
  // Number utilities
  formatNumber,
  formatPercentage,
  formatRatio,
  parseNumber,
  
  // Validation utilities
  isNumber,
  isPositiveNumber,
  isValidCurrencyAmount,
  isValidInterestRate,
  isValidEmail,
  validateObject
} from './src';

// Example usage of the library

// Currency formatting
console.log(formatCurrency(1234.56, { code: 'USD' })); // '$1,234.56'
console.log(formatCurrency(1234.56, { code: 'EUR', showCode: true })); // '€1,234.56 EUR'
console.log(formatCurrency(1234.56, { code: 'JPY', decimalPlaces: 0 })); // '¥1,235'

// Currency parsing
console.log(parseCurrency('$1,234.56').toString()); // '1234.56'
console.log(convertCurrency(1000, 1.15).toString()); // '1150'

// Date formatting
console.log(formatDate(new Date(), { format: DateFormats.ISO_DATE })); // '2023-04-25'
console.log(formatDate(new Date(), { format: DateFormats.LONG_DATE })); // 'April 25, 2023'

// Date operations
const date = new Date(2023, 3, 25); // April 25, 2023
console.log(formatDate(addToDate(date, 5, 'day'))); // '2023-04-30'
console.log(formatDate(subtractFromDate(date, 1, 'month'))); // '2023-03-25'
console.log(dateDiff('2023-04-25', '2023-04-20', 'day')); // 5

// Financial calculations
console.log(calculateSimpleInterest(1000, 0.05, 1).toString()); // '50'
console.log(calculateCompoundInterest(1000, 0.05, 1, 12).toString()); // '1051.1618125' (approx)

// Loan calculations
const loanAmount = 10000;
const interestRate = 0.05 / 12; // 5% annual rate, monthly payments
const loanTerm = 12 * 5; // 5 years in months
console.log(calculatePayment(loanAmount, interestRate, loanTerm).toString()); // Monthly payment
console.log(calculateRemainingBalance(loanAmount, interestRate, loanTerm, 12).toString()); // Balance after 1 year

// Number formatting
console.log(formatNumber(1234.56)); // '1,234.56'
console.log(formatPercentage(0.1234)); // '12.34%'
console.log(formatRatio(0.75)); // '3:4'
console.log(parseNumber('12.34%', { parsePercentage: true }).toString()); // '0.1234'

// Validation
console.log(isNumber('123')); // true
console.log(isPositiveNumber(-5)); // false
console.log(isValidCurrencyAmount(1000)); // true
console.log(isValidInterestRate(5.25)); // true
console.log(isValidEmail('user@example.com')); // true

// Object validation
const loanApplication = {
  principal: 10000,
  interestRate: 5.25,
  term: 60,
  email: 'borrower@example.com',
  phone: 'invalid'
};

const validationRules = {
  principal: { 
    validator: isValidCurrencyAmount, 
    message: 'Principal amount must be a valid currency amount'
  },
  interestRate: {
    validator: isValidInterestRate,
    message: 'Interest rate must be between 0 and 100'
  },
  term: {
    validator: isPositiveNumber,
    message: 'Term must be a positive number'
  },
  email: {
    validator: isValidEmail,
    message: 'Email must be a valid email address'
  },
  phone: {
    validator: isValidPhoneNumber,
    message: 'Phone must be a valid phone number'
  }
};

const errors = validateObject(loanApplication, validationRules);
console.log(errors); // { phone: 'Phone must be a valid phone number' }