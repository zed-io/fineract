import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a random string with a prefix
 * @param prefix Prefix for the string
 * @param length Length of the random part
 */
export function randomString(prefix: string = '', length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = prefix;
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Generate a random UUID
 */
export function randomUUID(): string {
  return uuidv4();
}

/**
 * Generate a random email address
 * @param domain Domain for the email
 */
export function randomEmail(domain: string = 'example.com'): string {
  return `test-${randomString('user-', 6)}@${domain}`;
}

/**
 * Generate a random date within a range
 * @param start Start date
 * @param end End date
 */
export function randomDate(start: Date = new Date(2020, 0, 1), end: Date = new Date()): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/**
 * Generate a random number within a range
 * @param min Minimum value
 * @param max Maximum value
 * @param decimals Number of decimal places
 */
export function randomNumber(min: number = 0, max: number = 100, decimals: number = 0): number {
  const value = Math.random() * (max - min) + min;
  return Number(value.toFixed(decimals));
}

/**
 * Generate a random boolean value
 * @param trueProbability Probability of returning true (0-1)
 */
export function randomBoolean(trueProbability: number = 0.5): boolean {
  return Math.random() < trueProbability;
}

/**
 * Generate a random item from an array
 * @param array Array to select from
 */
export function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Generate a random subset of items from an array
 * @param array Array to select from
 * @param count Number of items to select
 */
export function randomSubset<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
}

/**
 * Generate test client data
 */
export function generateClientData() {
  return {
    id: randomUUID(),
    first_name: randomString('First'),
    last_name: randomString('Last'),
    email: randomEmail(),
    phone_number: `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`,
    date_of_birth: randomDate(new Date(1970, 0, 1), new Date(2000, 0, 1)).toISOString().split('T')[0],
    address: {
      street: `${randomNumber(100, 999)} ${randomString('Street')}`,
      city: randomString('City'),
      state: randomString('State', 2).toUpperCase(),
      zip_code: randomString('', 5),
      country: 'US'
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * Generate test loan application data
 */
export function generateLoanApplicationData(clientId: string) {
  return {
    id: randomUUID(),
    client_id: clientId,
    loan_product_id: randomUUID(),
    principal_amount: randomNumber(1000, 10000, 2),
    term_months: randomNumber(12, 60),
    interest_rate: randomNumber(3, 15, 2),
    status: randomItem(['pending', 'approved', 'rejected']),
    purpose: randomItem(['home_improvement', 'education', 'debt_consolidation', 'business']),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * Generate test recurring deposit data
 */
export function generateRecurringDepositData(clientId: string) {
  return {
    id: randomUUID(),
    client_id: clientId,
    deposit_amount: randomNumber(100, 1000, 2),
    frequency: randomItem(['monthly', 'quarterly', 'semi_annually', 'annually']),
    interest_rate: randomNumber(2, 8, 2),
    term_months: randomNumber(12, 60),
    status: 'active',
    start_date: new Date().toISOString(),
    maturity_date: new Date(Date.now() + randomNumber(12, 60) * 30 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}