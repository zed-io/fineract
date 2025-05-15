/**
 * Loan application test fixtures
 */

export const testLoanProducts = [
  {
    id: 'aa111111-1111-1111-1111-111111111111',
    name: 'Personal Loan',
    description: 'Standard personal loan with fixed rate',
    min_amount: 1000,
    max_amount: 50000,
    min_term_months: 12,
    max_term_months: 60,
    interest_rate: 8.99,
    processing_fee_percent: 1.5,
    late_fee_amount: 25,
    requirements: ['ID proof', 'Income verification', 'Address proof'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'aa222222-2222-2222-2222-222222222222',
    name: 'Business Loan',
    description: 'Loan for small businesses with flexible terms',
    min_amount: 5000,
    max_amount: 100000,
    min_term_months: 24,
    max_term_months: 84,
    interest_rate: 10.5,
    processing_fee_percent: 2.0,
    late_fee_amount: 50,
    requirements: ['Business registration', 'Financial statements', 'Tax returns'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const testLoanApplications = [
  {
    id: 'bb111111-1111-1111-1111-111111111111',
    client_id: '11111111-1111-1111-1111-111111111111', // John Doe
    loan_product_id: 'aa111111-1111-1111-1111-111111111111', // Personal Loan
    principal_amount: 10000,
    term_months: 36,
    interest_rate: 8.99,
    status: 'pending',
    purpose: 'debt_consolidation',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'bb222222-2222-2222-2222-222222222222',
    client_id: '22222222-2222-2222-2222-222222222222', // Jane Smith
    loan_product_id: 'aa111111-1111-1111-1111-111111111111', // Personal Loan
    principal_amount: 5000,
    term_months: 24,
    interest_rate: 8.99,
    status: 'approved',
    purpose: 'education',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'bb333333-3333-3333-3333-333333333333',
    client_id: '33333333-3333-3333-3333-333333333333', // Robert Johnson
    loan_product_id: 'aa222222-2222-2222-2222-222222222222', // Business Loan
    principal_amount: 25000,
    term_months: 48,
    interest_rate: 10.5,
    status: 'rejected',
    purpose: 'business',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

/**
 * Get a test loan application by index or ID
 * @param indexOrId Index or ID of the loan application to return
 */
export function getTestLoanApplication(indexOrId: number | string) {
  if (typeof indexOrId === 'number') {
    return testLoanApplications[indexOrId];
  }
  return testLoanApplications.find(app => app.id === indexOrId);
}

/**
 * Get a test loan product by index or ID
 * @param indexOrId Index or ID of the loan product to return
 */
export function getTestLoanProduct(indexOrId: number | string) {
  if (typeof indexOrId === 'number') {
    return testLoanProducts[indexOrId];
  }
  return testLoanProducts.find(product => product.id === indexOrId);
}