import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import db from '../../utils/db';

/**
 * Integration tests for fixed deposit API
 * 
 * These tests require:
 * 1. A running Hasura instance
 * 2. The actions service running
 * 3. A test database with appropriate schema
 * 
 * Note: This is a template for integration tests. In a real implementation,
 * you would need to set up test data, clean it up after tests, and use
 * environment variables for configuration.
 */

// Configuration (would come from env vars in real implementation)
const API_URL = process.env.HASURA_ENDPOINT || 'http://localhost:8080/v1/graphql';
const ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET || 'your-admin-secret';
const TEST_USER_ID = 'test-user';

// Helper for making GraphQL requests
const executeQuery = async (query: string, variables: any = {}) => {
  try {
    const response = await axios.post(
      API_URL,
      { query, variables },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-hasura-admin-secret': ADMIN_SECRET,
          'x-hasura-role': 'admin',
          'x-hasura-user-id': TEST_USER_ID
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('GraphQL request failed:', error.response?.data || error.message);
    throw error;
  }
};

// Skip tests unless explicitly enabled
const integrationTestsEnabled = process.env.RUN_INTEGRATION_TESTS === 'true';
const itif = integrationTestsEnabled ? it : it.skip;

describe('Fixed Deposit Integration Tests', () => {
  // Test data
  let testClientId: string;
  let testProductId: string;
  let testAccountId: string;
  let testSavingsAccountId: string;
  
  // Setup test data before tests
  beforeAll(async () => {
    if (!integrationTestsEnabled) return;
    
    // Create test client
    testClientId = uuidv4();
    await db.query(`
      INSERT INTO client (
        id, office_id, status_enum, fullname, display_name, 
        mobile_no, date_of_birth, submitted_on_date, activation_date,
        created_by, created_date
      ) VALUES (
        $1, '91af8e1d-4ded-40b6-8433-b7f31b993bbd', 300, 'Test Client', 'Test Client',
        '123456789', '1990-01-01', NOW(), NOW(), 
        'test-system', NOW()
      )`, [testClientId]);
    
    // Create test fixed deposit product
    const savingsProductId = uuidv4();
    await db.query(`
      INSERT INTO savings_product (
        id, name, short_name, description, currency_code, currency_digits,
        nominal_annual_interest_rate, interest_compounding_period_type,
        interest_posting_period_type, interest_calculation_type,
        interest_calculation_days_in_year_type, min_required_opening_balance,
        accounting_type, active, created_by, created_date
      ) VALUES (
        $1, 'Test FD Product', 'TestFD', 'Test Fixed Deposit Product', 'USD', 2,
        5.0, 'monthly', 'quarterly', 'daily_balance',
        '365_days', 1000, 'cash_based', true, 'test-system', NOW()
      )`, [savingsProductId]);
    
    testProductId = uuidv4();
    await db.query(`
      INSERT INTO fixed_deposit_product (
        id, savings_product_id, min_deposit_term, max_deposit_term,
        min_deposit_term_type_enum, max_deposit_term_type_enum,
        is_premature_closure_allowed, pre_closure_penal_applicable,
        pre_closure_penal_interest, pre_closure_penal_interest_on_type_enum,
        pre_closure_penal_calculation_method, min_deposit_amount, max_deposit_amount,
        created_by, created_date
      ) VALUES (
        $1, $2, 3, 60, 'months', 'months', true, true,
        2.0, 'whole_term', 'percentage_of_interest', 1000, 1000000,
        'test-system', NOW()
      )`, [testProductId, savingsProductId]);
    
    // Create test savings account for transfers
    testSavingsAccountId = uuidv4();
    await db.query(`
      INSERT INTO savings_account (
        id, account_no, client_id, product_id, status_enum,
        currency_code, currency_digits, nominal_annual_interest_rate,
        interest_compounding_period_type, interest_posting_period_type,
        interest_calculation_type, interest_calculation_days_in_year_type,
        min_required_opening_balance, created_by, created_date,
        submitted_on_date, approved_on_date, activated_on_date
      ) VALUES (
        $1, 'SA001', $2, '94e61628-8f65-4d90-9a2f-5a57bcb6b425', 300,
        'USD', 2, 1.0, 'monthly', 'monthly',
        'daily_balance', '365_days', 0, 'test-system', NOW(),
        NOW(), NOW(), NOW()
      )`, [testSavingsAccountId, testClientId]);
  });
  
  // Clean up test data after tests
  afterAll(async () => {
    if (!integrationTestsEnabled) return;
    
    // Clean up fixed deposit accounts
    if (testAccountId) {
      await db.query(`DELETE FROM fixed_deposit_transaction WHERE fixed_deposit_account_id = $1`, [testAccountId]);
      await db.query(`DELETE FROM fixed_deposit_account WHERE id = $1`, [testAccountId]);
    }
    
    // Clean up products
    await db.query(`DELETE FROM fixed_deposit_product WHERE id = $1`, [testProductId]);
    
    // Clean up client and savings account
    await db.query(`DELETE FROM savings_account WHERE id = $1`, [testSavingsAccountId]);
    await db.query(`DELETE FROM client WHERE id = $1`, [testClientId]);
  });
  
  describe('Fixed Deposit Account Creation', () => {
    itif('should create a fixed deposit account', async () => {
      const createAccountMutation = `
        mutation CreateFixedDepositAccount($request: CreateFixedDepositAccountInput!) {
          createFixedDepositAccount(request: $request) {
            accountId
            success
            message
          }
        }
      `;
      
      const variables = {
        request: {
          productId: testProductId,
          clientId: testClientId,
          submittedOnDate: new Date().toISOString().split('T')[0],
          depositAmount: 5000,
          depositPeriod: 12,
          depositPeriodFrequencyType: "months",
          interestRate: 5.0
        }
      };
      
      const result = await executeQuery(createAccountMutation, variables);
      
      // Save account ID for use in other tests
      testAccountId = result.data.createFixedDepositAccount.accountId;
      
      expect(result.data.createFixedDepositAccount.success).toBe(true);
      expect(result.data.createFixedDepositAccount.accountId).toBeDefined();
    });
  });
  
  describe('Fixed Deposit Account Approval', () => {
    itif('should approve a fixed deposit account', async () => {
      const approveAccountMutation = `
        mutation ApproveFixedDepositAccount($request: ApproveFixedDepositAccountInput!) {
          approveFixedDepositAccount(request: $request) {
            accountId
            success
            message
            maturityDate
            maturityAmount
          }
        }
      `;
      
      const variables = {
        request: {
          accountId: testAccountId,
          approvedOnDate: new Date().toISOString().split('T')[0],
          note: "Approved by integration test"
        }
      };
      
      const result = await executeQuery(approveAccountMutation, variables);
      
      expect(result.data.approveFixedDepositAccount.success).toBe(true);
      expect(result.data.approveFixedDepositAccount.accountId).toBe(testAccountId);
      expect(result.data.approveFixedDepositAccount.maturityDate).toBeDefined();
      expect(result.data.approveFixedDepositAccount.maturityAmount).toBeGreaterThan(5000); // Should include interest
    });
  });
  
  describe('Fixed Deposit Account Activation', () => {
    itif('should activate a fixed deposit account', async () => {
      const activateAccountMutation = `
        mutation ActivateFixedDepositAccount($request: ActivateFixedDepositAccountInput!) {
          activateFixedDepositAccount(request: $request) {
            accountId
            success
            message
          }
        }
      `;
      
      const variables = {
        request: {
          accountId: testAccountId,
          activatedOnDate: new Date().toISOString().split('T')[0],
          note: "Activated by integration test"
        }
      };
      
      const result = await executeQuery(activateAccountMutation, variables);
      
      expect(result.data.activateFixedDepositAccount.success).toBe(true);
      expect(result.data.activateFixedDepositAccount.accountId).toBe(testAccountId);
    });
  });
  
  describe('Fixed Deposit Account Details', () => {
    itif('should get details of a fixed deposit account', async () => {
      const getAccountQuery = `
        query GetFixedDepositAccount($accountId: String!) {
          getFixedDepositAccount(accountId: $accountId) {
            id
            accountNo
            clientId
            clientName
            productId
            productName
            depositAmount
            maturityAmount
            maturityDate
            interestRate
            status {
              value
              active
            }
            summary {
              totalDeposits
              totalInterestEarned
            }
          }
        }
      `;
      
      const variables = {
        accountId: testAccountId
      };
      
      const result = await executeQuery(getAccountQuery, variables);
      
      expect(result.data.getFixedDepositAccount.id).toBe(testAccountId);
      expect(result.data.getFixedDepositAccount.depositAmount).toBe(5000);
      expect(result.data.getFixedDepositAccount.status.active).toBe(true);
    });
  });
  
  describe('Fixed Deposit Maturity Instructions', () => {
    itif('should update maturity instructions', async () => {
      const updateMaturityInstructionsMutation = `
        mutation UpdateFixedDepositMaturityInstructions($request: UpdateFixedDepositMaturityInstructionsInput!) {
          updateFixedDepositMaturityInstructions(request: $request) {
            accountId
            success
            message
            onAccountClosureType
          }
        }
      `;
      
      const variables = {
        request: {
          accountId: testAccountId,
          onAccountClosureType: "transfer_to_savings",
          transferToSavingsAccountId: testSavingsAccountId
        }
      };
      
      const result = await executeQuery(updateMaturityInstructionsMutation, variables);
      
      expect(result.data.updateFixedDepositMaturityInstructions.success).toBe(true);
      expect(result.data.updateFixedDepositMaturityInstructions.onAccountClosureType).toBe("transfer_to_savings");
    });
    
    itif('should get maturity details', async () => {
      const getMaturityDetailsQuery = `
        query GetFixedDepositMaturityDetails($accountId: String!) {
          getFixedDepositMaturityDetails(accountId: $accountId) {
            accountId
            maturityDate
            maturityAmount
            currentMaturityInstructions {
              code
              value
            }
            transferToSavingsAccountId
          }
        }
      `;
      
      const variables = {
        accountId: testAccountId
      };
      
      const result = await executeQuery(getMaturityDetailsQuery, variables);
      
      expect(result.data.getFixedDepositMaturityDetails.accountId).toBe(testAccountId);
      expect(result.data.getFixedDepositMaturityDetails.currentMaturityInstructions.code).toBe("transfer_to_savings");
      expect(result.data.getFixedDepositMaturityDetails.transferToSavingsAccountId).toBe(testSavingsAccountId);
    });
  });
  
  describe('Fixed Deposit Premature Closure', () => {
    itif('should get premature closure details', async () => {
      const getPrematureClosureDetailsQuery = `
        query GetFixedDepositPrematureClosureDetails($request: GetFixedDepositPrematureClosureDetailsInput!) {
          getFixedDepositPrematureClosureDetails(request: $request) {
            accountId
            depositAmount
            depositStartDate
            originalMaturityDate
            interestAccrued
            penaltyAmount
            penaltyCalculationMethod
            totalPayoutAmount
          }
        }
      `;
      
      const variables = {
        request: {
          accountId: testAccountId,
          closureDate: new Date().toISOString().split('T')[0]
        }
      };
      
      const result = await executeQuery(getPrematureClosureDetailsQuery, variables);
      
      expect(result.data.getFixedDepositPrematureClosureDetails.accountId).toBe(testAccountId);
      expect(result.data.getFixedDepositPrematureClosureDetails.depositAmount).toBe(5000);
      expect(result.data.getFixedDepositPrematureClosureDetails.penaltyCalculationMethod).toBe("Percentage of Interest");
    });
    
    itif('should process premature closure', async () => {
      const prematureCloseMutation = `
        mutation PrematureCloseFixedDepositAccount($request: PrematureCloseFixedDepositAccountInput!) {
          prematureCloseFixedDepositAccount(request: $request) {
            accountId
            success
            message
            totalAmount
            penaltyAmount
          }
        }
      `;
      
      const variables = {
        request: {
          accountId: testAccountId,
          closedOnDate: new Date().toISOString().split('T')[0],
          note: "Premature closure by integration test",
          onAccountClosureType: "transfer_to_savings",
          toSavingsAccountId: testSavingsAccountId
        }
      };
      
      const result = await executeQuery(prematureCloseMutation, variables);
      
      expect(result.data.prematureCloseFixedDepositAccount.success).toBe(true);
      expect(result.data.prematureCloseFixedDepositAccount.accountId).toBe(testAccountId);
      expect(result.data.prematureCloseFixedDepositAccount.totalAmount).toBeGreaterThan(0);
    });
  });
});