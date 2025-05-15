import { createTestContext, TestContext } from '@utils/test-context';
import { loginTestUser } from '@helpers/auth-helper';
import { generateClientData, generateRecurringDepositData } from '@helpers/data-generator';
import { CREATE_CLIENT } from '@graphql/mutations';
import { CREATE_RECURRING_DEPOSIT, UPDATE_RECURRING_DEPOSIT } from '@graphql/mutations';
import { GET_RECURRING_DEPOSIT, GET_RECURRING_DEPOSITS } from '@graphql/queries';
import { query } from '@utils/graphql-client';

describe('Recurring Deposit API Integration Tests', () => {
  let context: TestContext;
  let clientId: string;
  let depositId: string;

  // Setup test context and login before tests
  beforeAll(async () => {
    // Create and initialize test context
    context = await createTestContext();
    
    // Login with test user
    await loginTestUser(context);
    
    // Create a test client for our deposits
    const clientData = generateClientData();
    const clientResponse = await query<{ createClient: any }>(CREATE_CLIENT, {
      input: {
        first_name: clientData.first_name,
        last_name: clientData.last_name,
        email: clientData.email,
        phone_number: clientData.phone_number,
        date_of_birth: clientData.date_of_birth,
        address: clientData.address
      }
    });
    
    clientId = clientResponse.createClient.id;
    context.trackEntity('clients', clientId);
  });

  // Cleanup after all tests
  afterAll(async () => {
    await context.cleanup();
  });

  it('should create a new recurring deposit', async () => {
    // Skip if client wasn't created
    if (!clientId) {
      console.warn('Skipping test because client ID is not available');
      return;
    }
    
    // Generate test deposit data
    const depositData = generateRecurringDepositData(clientId);
    
    // Create deposit using GraphQL mutation
    const response = await query<{ createRecurringDeposit: any }>(CREATE_RECURRING_DEPOSIT, {
      input: {
        client_id: depositData.client_id,
        deposit_amount: depositData.deposit_amount,
        frequency: depositData.frequency,
        interest_rate: depositData.interest_rate,
        term_months: depositData.term_months,
        start_date: depositData.start_date
      }
    });
    
    // Store deposit ID for later tests
    depositId = response.createRecurringDeposit.id;
    
    // Track entity for cleanup
    context.trackEntity('recurring_deposits', depositId);
    
    // Assertions
    expect(response.createRecurringDeposit).toBeDefined();
    expect(response.createRecurringDeposit.id).toBeDefined();
    expect(response.createRecurringDeposit.client_id).toBe(clientId);
    expect(response.createRecurringDeposit.deposit_amount).toBe(depositData.deposit_amount);
    expect(response.createRecurringDeposit.frequency).toBe(depositData.frequency);
  });

  it('should get a recurring deposit by ID', async () => {
    // Skip if deposit wasn't created
    if (!depositId) {
      console.warn('Skipping test because deposit ID is not available');
      return;
    }
    
    // Fetch deposit by ID
    const response = await query<{ recurringDeposit: any }>(GET_RECURRING_DEPOSIT, { id: depositId });
    
    // Assertions
    expect(response.recurringDeposit).toBeDefined();
    expect(response.recurringDeposit.id).toBe(depositId);
    expect(response.recurringDeposit.client_id).toBe(clientId);
  });

  it('should update a recurring deposit', async () => {
    // Skip if deposit wasn't created
    if (!depositId) {
      console.warn('Skipping test because deposit ID is not available');
      return;
    }
    
    // Update data
    const updateData = {
      deposit_amount: 200.00,
      status: 'on_hold'
    };
    
    // Update deposit
    const response = await query<{ updateRecurringDeposit: any }>(UPDATE_RECURRING_DEPOSIT, {
      id: depositId,
      input: updateData
    });
    
    // Assertions
    expect(response.updateRecurringDeposit).toBeDefined();
    expect(response.updateRecurringDeposit.deposit_amount).toBe(updateData.deposit_amount);
    expect(response.updateRecurringDeposit.status).toBe(updateData.status);
  });

  it('should list recurring deposits for a client', async () => {
    // Skip if client wasn't created
    if (!clientId) {
      console.warn('Skipping test because client ID is not available');
      return;
    }
    
    // Fetch deposits for the client
    const response = await query<{ recurringDeposits: any[] }>(GET_RECURRING_DEPOSITS, {
      clientId: clientId,
      limit: 10,
      offset: 0
    });
    
    // Assertions
    expect(response.recurringDeposits).toBeDefined();
    expect(Array.isArray(response.recurringDeposits)).toBe(true);
    
    // Should find at least the deposit we created
    if (depositId) {
      const found = response.recurringDeposits.some(deposit => deposit.id === depositId);
      expect(found).toBe(true);
    }
  });
});