import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import db from '../../utils/db';

/**
 * Integration tests for Client-Group-Loan relationships
 * 
 * These tests verify the interactions between clients, groups, and loans, including:
 * 1. Group creation with multiple clients
 * 2. Group loan application and approval
 * 3. Loan distribution to group members
 * 4. Group loan repayments (contributed by different members)
 * 5. Client guarantor relationships for loans
 * 
 * These tests require:
 * 1. A running Hasura instance
 * 2. The actions service running
 * 3. A test database with appropriate schema
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

describe('Client-Group-Loan Integration Tests', () => {
  // Test data
  const testOfficeId = '91af8e1d-4ded-40b6-8433-b7f31b993bbd'; // Assuming this exists
  
  // IDs that will be populated during test execution
  let testClientIds: string[] = [];
  let testGroupId: string;
  let testLoanProductId: string;
  let testGroupLoanId: string;
  let testGuarantorId: string;
  
  // Setup test data before tests
  beforeAll(async () => {
    if (!integrationTestsEnabled) return;
    
    // Create test loan product for group lending
    testLoanProductId = uuidv4();
    await db.query(`
      INSERT INTO loan_product (
        id, name, short_name, description, currency_code, currency_digits,
        currency_multiplesof, principal_amount, min_principal_amount, 
        max_principal_amount, interest_rate_per_period, min_interest_rate_per_period,
        max_interest_rate_per_period, interest_rate_frequency_type, 
        annual_interest_rate, interest_method, interest_calculation_period_type,
        repayment_every, repayment_frequency, repayment_frequency_type,
        amortization_method, term_frequency, term_frequency_type,
        transaction_processing_strategy_id, accounting_type, allow_group_lending,
        created_by, created_date
      ) VALUES (
        $1, 'Test Group Loan Product', 'TGLP', 'Test Group Loan Product', 'USD', 2,
        1, 10000, 1000, 100000, 10.0, 5.0, 15.0, 2, 10.0, 1, 1, 1, 1, 2, 1, 12, 2,
        '92ae7c8c-1435-11ee-be56-0242ac120002', 1, true, 'test-system', NOW()
      )`, [testLoanProductId]);
    
    // Create multiple test clients (5 clients for the group)
    for (let i = 0; i < 5; i++) {
      const clientId = uuidv4();
      testClientIds.push(clientId);
      
      await db.query(`
        INSERT INTO client (
          id, office_id, status_enum, fullname, display_name, 
          mobile_no, date_of_birth, submitted_on_date, activation_date,
          created_by, created_date
        ) VALUES (
          $1, $2, 300, $3, $3,
          $4, '1990-01-01', NOW(), NOW(), 
          'test-system', NOW()
        )`, [clientId, testOfficeId, `Test Client ${i+1}`, `123${i}456789`]);
    }
  });
  
  // Clean up test data after tests
  afterAll(async () => {
    if (!integrationTestsEnabled) return;
    
    // Delete all test data in reverse order of creation
    
    // Delete loan transactions and loan
    if (testGroupLoanId) {
      await db.query(`DELETE FROM loan_transaction WHERE loan_id = $1`, [testGroupLoanId]);
      await db.query(`DELETE FROM loan_repayment_schedule WHERE loan_id = $1`, [testGroupLoanId]);
      await db.query(`DELETE FROM loan_charge WHERE loan_id = $1`, [testGroupLoanId]);
      await db.query(`DELETE FROM loan_guarantor WHERE loan_id = $1`, [testGroupLoanId]);
      await db.query(`DELETE FROM loan WHERE id = $1`, [testGroupLoanId]);
    }
    
    // Delete group roles and group memberships
    if (testGroupId) {
      await db.query(`DELETE FROM group_roles WHERE group_id = $1`, [testGroupId]);
      await db.query(`DELETE FROM group_client WHERE group_id = $1`, [testGroupId]);
      // Delete the group itself
      await db.query(`DELETE FROM client_group WHERE id = $1`, [testGroupId]);
    }
    
    // Delete test clients
    for (const clientId of testClientIds) {
      await db.query(`DELETE FROM client WHERE id = $1`, [clientId]);
    }
    
    // Delete test loan product
    await db.query(`DELETE FROM loan_product WHERE id = $1`, [testLoanProductId]);
  });
  
  describe('Group Creation and Management', () => {
    itif('should create a new group with clients', async () => {
      const createGroupMutation = `
        mutation CreateGroup($request: CreateGroupInput!) {
          createGroup(request: $request) {
            groupId
            groupName
            success
            message
          }
        }
      `;
      
      // Create a new group
      const createVariables = {
        request: {
          name: "Test Integration Group",
          officeId: testOfficeId,
          active: false,
          clientMembers: testClientIds.slice(0, 3) // Only add first 3 clients initially
        }
      };
      
      const result = await executeQuery(createGroupMutation, createVariables);
      
      // Save the group ID for later tests
      testGroupId = result.data.createGroup.groupId;
      
      expect(result.data.createGroup.success).toBe(true);
      expect(result.data.createGroup.groupId).toBeDefined();
      expect(result.data.createGroup.groupName).toBe("Test Integration Group");
    });
    
    itif('should add remaining clients to the group', async () => {
      const addMembersMutation = `
        mutation AddGroupMembers($request: AddGroupMembersInput!) {
          addGroupMembers(request: $request) {
            groupId
            success
            membersAdded
          }
        }
      `;
      
      const variables = {
        request: {
          groupId: testGroupId,
          clientIds: testClientIds.slice(3) // Add the remaining clients
        }
      };
      
      const result = await executeQuery(addMembersMutation, variables);
      
      expect(result.data.addGroupMembers.success).toBe(true);
      expect(result.data.addGroupMembers.groupId).toBe(testGroupId);
      expect(result.data.addGroupMembers.membersAdded).toBe(2); // Should add 2 members
    });
    
    itif('should assign leadership roles to clients in the group', async () => {
      const assignRoleMutation = `
        mutation AssignGroupRole($request: AssignGroupRoleInput!) {
          assignGroupRole(request: $request) {
            groupId
            clientId
            roleId
            success
          }
        }
      `;
      
      // Assign leader role to first client
      const leaderVariables = {
        request: {
          groupId: testGroupId,
          clientId: testClientIds[0],
          role: "leader"
        }
      };
      
      const leaderResult = await executeQuery(assignRoleMutation, leaderVariables);
      
      expect(leaderResult.data.assignGroupRole.success).toBe(true);
      
      // Assign secretary role to second client
      const secretaryVariables = {
        request: {
          groupId: testGroupId,
          clientId: testClientIds[1],
          role: "secretary"
        }
      };
      
      const secretaryResult = await executeQuery(assignRoleMutation, secretaryVariables);
      
      expect(secretaryResult.data.assignGroupRole.success).toBe(true);
      
      // Assign treasurer role to third client
      const treasurerVariables = {
        request: {
          groupId: testGroupId,
          clientId: testClientIds[2],
          role: "treasurer"
        }
      };
      
      const treasurerResult = await executeQuery(assignRoleMutation, treasurerVariables);
      
      expect(treasurerResult.data.assignGroupRole.success).toBe(true);
    });
    
    itif('should activate the group', async () => {
      const activateGroupMutation = `
        mutation ActivateGroup($request: ActivateGroupInput!) {
          activateGroup(request: $request) {
            groupId
            success
            message
          }
        }
      `;
      
      const variables = {
        request: {
          groupId: testGroupId,
          activationDate: new Date().toISOString().split('T')[0]
        }
      };
      
      const result = await executeQuery(activateGroupMutation, variables);
      
      expect(result.data.activateGroup.success).toBe(true);
      expect(result.data.activateGroup.groupId).toBe(testGroupId);
    });
    
    itif('should retrieve group details with members and roles', async () => {
      const getGroupQuery = `
        query GetGroup($request: GetGroupInput!) {
          getGroup(request: $request) {
            id
            name
            officeId
            officeName
            status
            active
            activationDate
            members {
              clientId
              clientName
              roles {
                roleId
                roleName
              }
            }
          }
        }
      `;
      
      const variables = {
        request: {
          groupId: testGroupId,
          includeMembers: true,
          includeRoles: true
        }
      };
      
      const result = await executeQuery(getGroupQuery, variables);
      
      expect(result.data.getGroup.id).toBe(testGroupId);
      expect(result.data.getGroup.name).toBe("Test Integration Group");
      expect(result.data.getGroup.active).toBe(true);
      expect(result.data.getGroup.members.length).toBe(5);
      
      // Check that roles are assigned correctly
      const leaderMember = result.data.getGroup.members.find(
        m => m.clientId === testClientIds[0]
      );
      expect(leaderMember.roles.some(r => r.roleName === "Leader")).toBe(true);
      
      const secretaryMember = result.data.getGroup.members.find(
        m => m.clientId === testClientIds[1]
      );
      expect(secretaryMember.roles.some(r => r.roleName === "Secretary")).toBe(true);
      
      const treasurerMember = result.data.getGroup.members.find(
        m => m.clientId === testClientIds[2]
      );
      expect(treasurerMember.roles.some(r => r.roleName === "Treasurer")).toBe(true);
    });
  });
  
  describe('Group Loan Application and Management', () => {
    itif('should create a loan for the group', async () => {
      const createGroupLoanMutation = `
        mutation CreateGroupLoan($request: CreateGroupLoanInput!) {
          createGroupLoan(request: $request) {
            success
            loanId
            accountNumber
            loanStatus
            groupId
          }
        }
      `;
      
      const today = new Date().toISOString().split('T')[0];
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const expectedDisbursementDate = futureDate.toISOString().split('T')[0];
      
      const variables = {
        request: {
          groupId: testGroupId,
          productId: testLoanProductId,
          principal: 25000,
          interestRate: 10.0,
          termFrequency: 12,
          termFrequencyType: "months",
          repaymentEvery: 1,
          repaymentFrequency: 1,
          repaymentFrequencyType: "months",
          interestType: 1, // Declining Balance
          interestCalculationPeriodType: 1, // Same as repayment
          amortizationType: 1, // Equal Installments
          submittedOnDate: today,
          expectedDisbursementDate: expectedDisbursementDate,
          note: "Test group loan for integration tests"
        }
      };
      
      const result = await executeQuery(createGroupLoanMutation, variables);
      
      // Save loan ID for later tests
      testGroupLoanId = result.data.createGroupLoan.loanId;
      
      expect(result.data.createGroupLoan.success).toBe(true);
      expect(result.data.createGroupLoan.loanId).toBeDefined();
      expect(result.data.createGroupLoan.groupId).toBe(testGroupId);
      expect(result.data.createGroupLoan.loanStatus).toBe('submitted_and_pending_approval');
    });
    
    itif('should retrieve group loan details', async () => {
      const getGroupLoanDetailsQuery = `
        query GetGroupLoanDetails($request: GetGroupLoanDetailsInput!) {
          getGroupLoanDetails(request: $request) {
            loanDetails {
              id
              accountNo
              status
              groupId
              groupName
              principal
              interestRate
              termFrequency
              termFrequencyType
              submittedOnDate
            }
            notes {
              note
            }
          }
        }
      `;
      
      const variables = {
        request: {
          groupId: testGroupId,
          loanId: testGroupLoanId
        }
      };
      
      const result = await executeQuery(getGroupLoanDetailsQuery, variables);
      
      expect(result.data.getGroupLoanDetails.loanDetails.id).toBe(testGroupLoanId);
      expect(result.data.getGroupLoanDetails.loanDetails.groupId).toBe(testGroupId);
      expect(result.data.getGroupLoanDetails.loanDetails.principal).toBe(25000);
      expect(result.data.getGroupLoanDetails.notes[0].note).toBe("Test group loan for integration tests");
    });
    
    itif('should add a guarantor to the loan', async () => {
      // We'll use the last client as a guarantor for the group loan
      const addGuarantorMutation = `
        mutation AddLoanGuarantor($request: AddLoanGuarantorInput!) {
          addLoanGuarantor(request: $request) {
            guarantorId
            loanId
            success
            message
          }
        }
      `;
      
      const variables = {
        request: {
          loanId: testGroupLoanId,
          guarantorType: "client",
          clientId: testClientIds[4], // Use the last client as guarantor
          guaranteedAmount: 5000 // Guaranteeing part of the loan
        }
      };
      
      const result = await executeQuery(addGuarantorMutation, variables);
      
      // Save guarantor ID for later references
      testGuarantorId = result.data.addLoanGuarantor.guarantorId;
      
      expect(result.data.addLoanGuarantor.success).toBe(true);
      expect(result.data.addLoanGuarantor.loanId).toBe(testGroupLoanId);
      expect(result.data.addLoanGuarantor.guarantorId).toBeDefined();
    });
    
    itif('should approve the group loan', async () => {
      const approveLoanMutation = `
        mutation ApproveLoan($request: ApproveLoanInput!) {
          approveLoan(request: $request) {
            loanId
            success
            message
          }
        }
      `;
      
      const today = new Date().toISOString().split('T')[0];
      
      const variables = {
        request: {
          loanId: testGroupLoanId,
          approvedOnDate: today,
          approvedLoanAmount: 25000,
          expectedDisbursementDate: today,
          note: "Approved by integration test"
        }
      };
      
      const result = await executeQuery(approveLoanMutation, variables);
      
      expect(result.data.approveLoan.success).toBe(true);
      expect(result.data.approveLoan.loanId).toBe(testGroupLoanId);
    });
    
    itif('should disburse the group loan', async () => {
      const disburseLoanMutation = `
        mutation DisburseLoan($request: DisburseLoanInput!) {
          disburseLoan(request: $request) {
            loanId
            success
            message
          }
        }
      `;
      
      const today = new Date().toISOString().split('T')[0];
      
      const variables = {
        request: {
          loanId: testGroupLoanId,
          transactionDate: today,
          actualDisbursementDate: today,
          paymentTypeId: "ce4e73ef-40b5-4331-9450-f24e283f2208", // Assuming a payment type ID exists
          note: "Disbursed by integration test"
        }
      };
      
      const result = await executeQuery(disburseLoanMutation, variables);
      
      expect(result.data.disburseLoan.success).toBe(true);
      expect(result.data.disburseLoan.loanId).toBe(testGroupLoanId);
    });
    
    itif('should make a partial loan repayment from a group member', async () => {
      const makeLoanRepaymentMutation = `
        mutation MakeLoanRepayment($request: MakeLoanRepaymentInput!) {
          makeLoanRepayment(request: $request) {
            loanId
            transactionId
            success
            message
          }
        }
      `;
      
      const today = new Date().toISOString().split('T')[0];
      
      // Make a repayment from the first client
      const variables = {
        request: {
          loanId: testGroupLoanId,
          transactionDate: today,
          transactionAmount: 2500, // Partial repayment
          paymentTypeId: "ce4e73ef-40b5-4331-9450-f24e283f2208", // Assuming a payment type ID exists
          clientContributorId: testClientIds[0], // Specify which client is making the repayment
          note: "Partial repayment by group member"
        }
      };
      
      const result = await executeQuery(makeLoanRepaymentMutation, variables);
      
      expect(result.data.makeLoanRepayment.success).toBe(true);
      expect(result.data.makeLoanRepayment.loanId).toBe(testGroupLoanId);
      expect(result.data.makeLoanRepayment.transactionId).toBeDefined();
    });
    
    itif('should make another loan repayment from a different group member', async () => {
      const makeLoanRepaymentMutation = `
        mutation MakeLoanRepayment($request: MakeLoanRepaymentInput!) {
          makeLoanRepayment(request: $request) {
            loanId
            transactionId
            success
            message
          }
        }
      `;
      
      const today = new Date().toISOString().split('T')[0];
      
      // Make a repayment from the second client
      const variables = {
        request: {
          loanId: testGroupLoanId,
          transactionDate: today,
          transactionAmount: 2000, // Another partial repayment
          paymentTypeId: "ce4e73ef-40b5-4331-9450-f24e283f2208", // Assuming a payment type ID exists
          clientContributorId: testClientIds[1], // Second client making repayment
          note: "Partial repayment by second group member"
        }
      };
      
      const result = await executeQuery(makeLoanRepaymentMutation, variables);
      
      expect(result.data.makeLoanRepayment.success).toBe(true);
      expect(result.data.makeLoanRepayment.loanId).toBe(testGroupLoanId);
      expect(result.data.makeLoanRepayment.transactionId).toBeDefined();
    });
    
    itif('should get group loan transaction history with member contributions', async () => {
      const getLoanTransactionsQuery = `
        query GetLoanTransactions($loanId: String!) {
          getLoanTransactions(loanId: $loanId) {
            transactions {
              id
              transactionType
              transactionTypeDescription
              amount
              principal
              interest
              outstandingBalance
              transactionDate
              contributorClientId
              contributorClientName
              note
            }
          }
        }
      `;
      
      const variables = {
        loanId: testGroupLoanId
      };
      
      const result = await executeQuery(getLoanTransactionsQuery, variables);
      
      // Should have at least 3 transactions (disbursement + 2 repayments)
      expect(result.data.getLoanTransactions.transactions.length).toBeGreaterThanOrEqual(3);
      
      // Find the repayment transactions
      const repaymentTransactions = result.data.getLoanTransactions.transactions.filter(
        tx => tx.transactionType === 'repayment'
      );
      
      expect(repaymentTransactions.length).toBe(2);
      
      // Verify the contributor info is correctly recorded
      const client1Repayment = repaymentTransactions.find(
        tx => tx.contributorClientId === testClientIds[0]
      );
      expect(client1Repayment).toBeDefined();
      expect(client1Repayment.amount).toBe(2500);
      
      const client2Repayment = repaymentTransactions.find(
        tx => tx.contributorClientId === testClientIds[1]
      );
      expect(client2Repayment).toBeDefined();
      expect(client2Repayment.amount).toBe(2000);
    });
    
    itif('should get loan summary statistics for the group', async () => {
      const getGroupLoanSummaryQuery = `
        query GetGroupLoanSummary($request: GetGroupLoanSummaryInput!) {
          getGroupLoanSummary(request: $request) {
            statistics {
              totalLoans
              activeLoans
              totalPrincipal
              totalOutstanding
              totalPrincipalRepaid
              totalInterestRepaid
            }
            recentLoans {
              id
              accountNo
              principal
              status
            }
          }
        }
      `;
      
      const variables = {
        request: {
          groupId: testGroupId
        }
      };
      
      const result = await executeQuery(getGroupLoanSummaryQuery, variables);
      
      expect(result.data.getGroupLoanSummary.statistics.totalLoans).toBe(1);
      expect(result.data.getGroupLoanSummary.statistics.activeLoans).toBe(1);
      expect(result.data.getGroupLoanSummary.statistics.totalPrincipal).toBe(25000);
      
      // Outstanding should be less than original principal due to repayments
      const repaidAmount = 2500 + 2000;
      expect(result.data.getGroupLoanSummary.statistics.totalPrincipalRepaid).toBeGreaterThanOrEqual(repaidAmount);
      
      // Recent loans should include our test loan
      expect(result.data.getGroupLoanSummary.recentLoans.length).toBeGreaterThan(0);
      expect(result.data.getGroupLoanSummary.recentLoans[0].id).toBe(testGroupLoanId);
    });
  });
  
  describe('Guarantor and Loan Relationships', () => {
    itif('should retrieve guarantor details for the loan', async () => {
      const getLoanGuarantorsQuery = `
        query GetLoanGuarantors($loanId: String!) {
          getLoanGuarantors(loanId: $loanId) {
            guarantors {
              id
              guarantorType
              clientId
              clientName
              guaranteedAmount
              status
            }
          }
        }
      `;
      
      const variables = {
        loanId: testGroupLoanId
      };
      
      const result = await executeQuery(getLoanGuarantorsQuery, variables);
      
      expect(result.data.getLoanGuarantors.guarantors.length).toBe(1);
      expect(result.data.getLoanGuarantors.guarantors[0].id).toBe(testGuarantorId);
      expect(result.data.getLoanGuarantors.guarantors[0].clientId).toBe(testClientIds[4]);
      expect(result.data.getLoanGuarantors.guarantors[0].guaranteedAmount).toBe(5000);
    });
    
    itif('should retrieve loans guaranteed by a client', async () => {
      const getClientGuaranteedLoansQuery = `
        query GetClientGuaranteedLoans($clientId: String!) {
          getClientGuaranteedLoans(clientId: $clientId) {
            guaranteedLoans {
              loanId
              loanAccountNo
              clientId
              clientName
              groupId
              groupName
              loanAmount
              guaranteedAmount
              outstandingAmount
              status
            }
          }
        }
      `;
      
      const variables = {
        clientId: testClientIds[4]
      };
      
      const result = await executeQuery(getClientGuaranteedLoansQuery, variables);
      
      expect(result.data.getClientGuaranteedLoans.guaranteedLoans.length).toBe(1);
      expect(result.data.getClientGuaranteedLoans.guaranteedLoans[0].loanId).toBe(testGroupLoanId);
      expect(result.data.getClientGuaranteedLoans.guaranteedLoans[0].groupId).toBe(testGroupId);
      expect(result.data.getClientGuaranteedLoans.guaranteedLoans[0].guaranteedAmount).toBe(5000);
    });
  });
});