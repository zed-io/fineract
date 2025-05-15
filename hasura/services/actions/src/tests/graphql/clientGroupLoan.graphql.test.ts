import { gql } from 'graphql-tag';
import { ApolloServer } from 'apollo-server-express';
import { createTestClient } from 'apollo-server-testing';
import { makeExecutableSchema } from '@graphql-tools/schema';

/**
 * GraphQL schema tests for client-group-loan relationships
 * 
 * These tests verify the GraphQL schema and resolvers for 
 * client-group-loan relationship queries and mutations without 
 * requiring database connectivity.
 */

// Mock context for all resolvers
const mockContext = {
  session_variables: {
    'x-hasura-user-id': 'test-user',
    'x-hasura-role': 'admin'
  }
};

// Mock services responses
const mockGroupService = {
  createGroup: jest.fn().mockResolvedValue({
    groupId: 'mock-group-id',
    groupName: 'Test Group',
    success: true
  }),
  getGroup: jest.fn().mockResolvedValue({
    id: 'mock-group-id',
    name: 'Test Group',
    status: 'active',
    active: true,
    officeId: 'office-id',
    officeName: 'Test Office',
    activationDate: '2023-01-01',
    members: [
      {
        clientId: 'client-1',
        clientName: 'Client 1',
        roles: [{ roleId: 'role-1', roleName: 'Leader' }]
      },
      {
        clientId: 'client-2',
        clientName: 'Client 2',
        roles: []
      }
    ]
  }),
  assignMembers: jest.fn().mockResolvedValue({
    groupId: 'mock-group-id',
    success: true,
    membersAdded: 2
  }),
  assignRole: jest.fn().mockResolvedValue({
    groupId: 'mock-group-id',
    clientId: 'client-1',
    roleId: 'role-1',
    success: true
  }),
  activateGroup: jest.fn().mockResolvedValue({
    groupId: 'mock-group-id',
    success: true
  })
};

const mockGroupLoanService = {
  createGroupLoan: jest.fn().mockResolvedValue({
    success: true,
    loanId: 'mock-loan-id',
    accountNumber: 'GL123456',
    loanStatus: 'submitted_and_pending_approval',
    groupId: 'mock-group-id'
  }),
  getGroupLoanDetails: jest.fn().mockResolvedValue({
    loanDetails: {
      id: 'mock-loan-id',
      accountNo: 'GL123456',
      status: 'active',
      groupId: 'mock-group-id',
      groupName: 'Test Group',
      principal: 10000,
      interestRate: 10.0,
      termFrequency: 12,
      termFrequencyType: 'months'
    },
    transactions: [
      {
        id: 'tx-1',
        transactionType: 'disbursement',
        amount: 10000,
        transactionDate: '2023-01-15'
      },
      {
        id: 'tx-2',
        transactionType: 'repayment',
        amount: 1000,
        contributorClientId: 'client-1',
        contributorClientName: 'Client 1',
        transactionDate: '2023-02-15'
      }
    ],
    repaymentSchedule: [
      {
        installmentNumber: 1,
        dueDate: '2023-02-15',
        totalAmount: 1000,
        principalAmount: 800,
        interestAmount: 200,
        completed: true
      },
      {
        installmentNumber: 2,
        dueDate: '2023-03-15',
        totalAmount: 1000,
        principalAmount: 830,
        interestAmount: 170,
        completed: false
      }
    ],
    notes: [
      { note: 'Test loan note' }
    ]
  }),
  getGroupLoanSummary: jest.fn().mockResolvedValue({
    statistics: {
      totalLoans: 1,
      activeLoans: 1,
      totalPrincipal: 10000,
      totalOutstanding: 9000,
      totalPrincipalRepaid: 1000
    },
    recentLoans: [
      {
        id: 'mock-loan-id',
        accountNo: 'GL123456',
        status: 'active',
        principal: 10000
      }
    ]
  })
};

const mockLoanService = {
  approveLoan: jest.fn().mockResolvedValue({
    loanId: 'mock-loan-id',
    success: true
  }),
  disburseLoan: jest.fn().mockResolvedValue({
    loanId: 'mock-loan-id',
    success: true
  }),
  makeLoanRepayment: jest.fn().mockResolvedValue({
    loanId: 'mock-loan-id',
    transactionId: 'tx-2',
    success: true
  }),
  addGuarantor: jest.fn().mockResolvedValue({
    guarantorId: 'guarantor-1',
    loanId: 'mock-loan-id',
    success: true
  }),
  getLoanGuarantors: jest.fn().mockResolvedValue({
    guarantors: [
      {
        id: 'guarantor-1',
        guarantorType: 'client',
        clientId: 'client-3',
        clientName: 'Client 3',
        guaranteedAmount: 2000,
        status: 'active'
      }
    ]
  }),
  getClientGuaranteedLoans: jest.fn().mockResolvedValue({
    guaranteedLoans: [
      {
        loanId: 'mock-loan-id',
        loanAccountNo: 'GL123456',
        groupId: 'mock-group-id',
        groupName: 'Test Group',
        loanAmount: 10000,
        guaranteedAmount: 2000,
        outstandingAmount: 9000,
        status: 'active'
      }
    ]
  })
};

// Mock resolvers
const resolvers = {
  Query: {
    getGroup: (_, { request }) => {
      return mockGroupService.getGroup(
        request.groupId,
        request.includeMembers,
        request.includeRoles
      );
    },
    getGroupLoanDetails: (_, { request }) => {
      return mockGroupLoanService.getGroupLoanDetails(
        request.groupId,
        request.loanId
      );
    },
    getGroupLoanSummary: (_, { request }) => {
      return mockGroupLoanService.getGroupLoanSummary(request.groupId);
    },
    getLoanGuarantors: (_, { loanId }) => {
      return { guarantors: mockLoanService.getLoanGuarantors(loanId).guarantors };
    },
    getClientGuaranteedLoans: (_, { clientId }) => {
      return { guaranteedLoans: mockLoanService.getClientGuaranteedLoans(clientId).guaranteedLoans };
    }
  },
  Mutation: {
    createGroup: (_, { request }, context) => {
      return mockGroupService.createGroup(request, context.session_variables['x-hasura-user-id']);
    },
    addGroupMembers: (_, { request }, context) => {
      return mockGroupService.assignMembers(request, context.session_variables['x-hasura-user-id']);
    },
    assignGroupRole: (_, { request }, context) => {
      return mockGroupService.assignRole(request, context.session_variables['x-hasura-user-id']);
    },
    activateGroup: (_, { request }, context) => {
      return mockGroupService.activateGroup(
        request.groupId,
        { activationDate: request.activationDate },
        context.session_variables['x-hasura-user-id']
      );
    },
    createGroupLoan: (_, { request }, context) => {
      const { groupId, ...loanData } = request;
      return mockGroupLoanService.createGroupLoan(
        groupId,
        loanData,
        context.session_variables['x-hasura-user-id']
      );
    },
    approveLoan: (_, { request }, context) => {
      return mockLoanService.approveLoan(request, context.session_variables['x-hasura-user-id']);
    },
    disburseLoan: (_, { request }, context) => {
      return mockLoanService.disburseLoan(request, context.session_variables['x-hasura-user-id']);
    },
    makeLoanRepayment: (_, { request }, context) => {
      return mockLoanService.makeLoanRepayment(request, context.session_variables['x-hasura-user-id']);
    },
    addLoanGuarantor: (_, { request }, context) => {
      return mockLoanService.addGuarantor(request, context.session_variables['x-hasura-user-id']);
    }
  }
};

// GraphQL schema
const typeDefs = gql`
  # Types
  type Group {
    id: String!
    name: String!
    officeId: String!
    officeName: String
    status: String!
    active: Boolean!
    activationDate: String
    members: [GroupMember]
  }

  type GroupMember {
    clientId: String!
    clientName: String!
    roles: [GroupRole]
  }

  type GroupRole {
    roleId: String!
    roleName: String!
  }

  type Loan {
    id: String!
    accountNo: String!
    status: String!
    groupId: String
    groupName: String
    clientId: String
    clientName: String
    principal: Float!
    interestRate: Float!
    termFrequency: Int!
    termFrequencyType: String!
    submittedOnDate: String
  }

  type LoanTransaction {
    id: String!
    transactionType: String!
    amount: Float!
    principal: Float
    interest: Float
    outstandingBalance: Float
    transactionDate: String!
    contributorClientId: String
    contributorClientName: String
    note: String
  }

  type LoanSchedule {
    installmentNumber: Int!
    dueDate: String!
    totalAmount: Float!
    principalAmount: Float!
    interestAmount: Float!
    completed: Boolean!
  }

  type LoanNote {
    note: String!
  }

  type LoanGuarantor {
    id: String!
    guarantorType: String!
    clientId: String
    clientName: String
    guaranteedAmount: Float!
    status: String!
  }

  type GuaranteedLoan {
    loanId: String!
    loanAccountNo: String!
    clientId: String
    clientName: String
    groupId: String
    groupName: String
    loanAmount: Float!
    guaranteedAmount: Float!
    outstandingAmount: Float!
    status: String!
  }

  type LoanStatistics {
    totalLoans: Int!
    activeLoans: Int!
    totalPrincipal: Float!
    totalOutstanding: Float!
    totalPrincipalRepaid: Float!
    totalInterestRepaid: Float
  }

  # Response types
  type CreateGroupResponse {
    groupId: String!
    groupName: String!
    success: Boolean!
    message: String
  }

  type AddGroupMembersResponse {
    groupId: String!
    success: Boolean!
    membersAdded: Int!
  }

  type AssignGroupRoleResponse {
    groupId: String!
    clientId: String!
    roleId: String!
    success: Boolean!
  }

  type ActivateGroupResponse {
    groupId: String!
    success: Boolean!
    message: String
  }

  type CreateGroupLoanResponse {
    success: Boolean!
    loanId: String!
    accountNumber: String!
    loanStatus: String!
    groupId: String!
  }

  type ApproveLoanResponse {
    loanId: String!
    success: Boolean!
    message: String
  }

  type DisburseLoanResponse {
    loanId: String!
    success: Boolean!
    message: String
  }

  type MakeLoanRepaymentResponse {
    loanId: String!
    transactionId: String!
    success: Boolean!
    message: String
  }

  type AddLoanGuarantorResponse {
    guarantorId: String!
    loanId: String!
    success: Boolean!
    message: String
  }

  type GroupLoanDetailsResponse {
    loanDetails: Loan!
    transactions: [LoanTransaction]
    repaymentSchedule: [LoanSchedule]
    notes: [LoanNote]
  }

  type GroupLoanSummaryResponse {
    statistics: LoanStatistics!
    recentLoans: [Loan]
  }

  type LoanGuarantorsResponse {
    guarantors: [LoanGuarantor]!
  }

  type ClientGuaranteedLoansResponse {
    guaranteedLoans: [GuaranteedLoan]!
  }

  # Input types
  input CreateGroupInput {
    name: String!
    officeId: String!
    active: Boolean
    clientMembers: [String]
  }

  input AddGroupMembersInput {
    groupId: String!
    clientIds: [String]!
  }

  input AssignGroupRoleInput {
    groupId: String!
    clientId: String!
    role: String!
  }

  input ActivateGroupInput {
    groupId: String!
    activationDate: String!
  }

  input GetGroupInput {
    groupId: String!
    includeMembers: Boolean
    includeRoles: Boolean
    includeNotes: Boolean
  }

  input CreateGroupLoanInput {
    groupId: String!
    productId: String!
    principal: Float!
    interestRate: Float!
    termFrequency: Int!
    termFrequencyType: String!
    repaymentEvery: Int!
    repaymentFrequency: Int!
    repaymentFrequencyType: String!
    interestType: Int!
    interestCalculationPeriodType: Int!
    amortizationType: Int!
    submittedOnDate: String!
    expectedDisbursementDate: String
    note: String
  }

  input ApproveLoanInput {
    loanId: String!
    approvedOnDate: String!
    approvedLoanAmount: Float!
    expectedDisbursementDate: String
    note: String
  }

  input DisburseLoanInput {
    loanId: String!
    transactionDate: String!
    actualDisbursementDate: String!
    paymentTypeId: String
    note: String
  }

  input MakeLoanRepaymentInput {
    loanId: String!
    transactionDate: String!
    transactionAmount: Float!
    paymentTypeId: String
    clientContributorId: String
    note: String
  }

  input AddLoanGuarantorInput {
    loanId: String!
    guarantorType: String!
    clientId: String
    guaranteedAmount: Float!
  }

  input GetGroupLoanDetailsInput {
    groupId: String!
    loanId: String!
  }

  input GetGroupLoanSummaryInput {
    groupId: String!
  }

  # Queries and Mutations
  type Query {
    getGroup(request: GetGroupInput!): Group!
    getGroupLoanDetails(request: GetGroupLoanDetailsInput!): GroupLoanDetailsResponse!
    getGroupLoanSummary(request: GetGroupLoanSummaryInput!): GroupLoanSummaryResponse!
    getLoanGuarantors(loanId: String!): LoanGuarantorsResponse!
    getClientGuaranteedLoans(clientId: String!): ClientGuaranteedLoansResponse!
  }

  type Mutation {
    createGroup(request: CreateGroupInput!): CreateGroupResponse!
    addGroupMembers(request: AddGroupMembersInput!): AddGroupMembersResponse!
    assignGroupRole(request: AssignGroupRoleInput!): AssignGroupRoleResponse!
    activateGroup(request: ActivateGroupInput!): ActivateGroupResponse!
    createGroupLoan(request: CreateGroupLoanInput!): CreateGroupLoanResponse!
    approveLoan(request: ApproveLoanInput!): ApproveLoanResponse!
    disburseLoan(request: DisburseLoanInput!): DisburseLoanResponse!
    makeLoanRepayment(request: MakeLoanRepaymentInput!): MakeLoanRepaymentResponse!
    addLoanGuarantor(request: AddLoanGuarantorInput!): AddLoanGuarantorResponse!
  }
`;

// Create a test Apollo Server
const schema = makeExecutableSchema({ typeDefs, resolvers });
const server = new ApolloServer({ 
  schema,
  context: () => mockContext
});
const { query, mutate } = createTestClient(server);

describe('Client-Group-Loan GraphQL Schema Tests', () => {
  describe('Group Management', () => {
    test('should create a new group', async () => {
      const CREATE_GROUP = gql`
        mutation CreateGroup($request: CreateGroupInput!) {
          createGroup(request: $request) {
            groupId
            groupName
            success
          }
        }
      `;
      
      const variables = {
        request: {
          name: "Test Group",
          officeId: "office-id",
          active: false,
          clientMembers: ["client-1", "client-2"]
        }
      };
      
      const response = await mutate({ mutation: CREATE_GROUP, variables });
      
      expect(response.errors).toBeUndefined();
      expect(response.data?.createGroup.success).toBe(true);
      expect(response.data?.createGroup.groupId).toBe('mock-group-id');
      expect(response.data?.createGroup.groupName).toBe('Test Group');
    });
    
    test('should add members to a group', async () => {
      const ADD_MEMBERS = gql`
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
          groupId: "mock-group-id",
          clientIds: ["client-3", "client-4"]
        }
      };
      
      const response = await mutate({ mutation: ADD_MEMBERS, variables });
      
      expect(response.errors).toBeUndefined();
      expect(response.data?.addGroupMembers.success).toBe(true);
      expect(response.data?.addGroupMembers.groupId).toBe('mock-group-id');
      expect(response.data?.addGroupMembers.membersAdded).toBe(2);
    });
    
    test('should assign a role to a client in a group', async () => {
      const ASSIGN_ROLE = gql`
        mutation AssignGroupRole($request: AssignGroupRoleInput!) {
          assignGroupRole(request: $request) {
            groupId
            clientId
            roleId
            success
          }
        }
      `;
      
      const variables = {
        request: {
          groupId: "mock-group-id",
          clientId: "client-1",
          role: "leader"
        }
      };
      
      const response = await mutate({ mutation: ASSIGN_ROLE, variables });
      
      expect(response.errors).toBeUndefined();
      expect(response.data?.assignGroupRole.success).toBe(true);
      expect(response.data?.assignGroupRole.groupId).toBe('mock-group-id');
      expect(response.data?.assignGroupRole.clientId).toBe('client-1');
      expect(response.data?.assignGroupRole.roleId).toBe('role-1');
    });
    
    test('should activate a group', async () => {
      const ACTIVATE_GROUP = gql`
        mutation ActivateGroup($request: ActivateGroupInput!) {
          activateGroup(request: $request) {
            groupId
            success
          }
        }
      `;
      
      const variables = {
        request: {
          groupId: "mock-group-id",
          activationDate: "2023-01-01"
        }
      };
      
      const response = await mutate({ mutation: ACTIVATE_GROUP, variables });
      
      expect(response.errors).toBeUndefined();
      expect(response.data?.activateGroup.success).toBe(true);
      expect(response.data?.activateGroup.groupId).toBe('mock-group-id');
    });
    
    test('should get group details with members and roles', async () => {
      const GET_GROUP = gql`
        query GetGroup($request: GetGroupInput!) {
          getGroup(request: $request) {
            id
            name
            status
            active
            officeId
            officeName
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
          groupId: "mock-group-id",
          includeMembers: true,
          includeRoles: true
        }
      };
      
      const response = await query({ query: GET_GROUP, variables });
      
      expect(response.errors).toBeUndefined();
      expect(response.data?.getGroup.id).toBe('mock-group-id');
      expect(response.data?.getGroup.name).toBe('Test Group');
      expect(response.data?.getGroup.active).toBe(true);
      expect(response.data?.getGroup.members).toHaveLength(2);
      
      // Check that the first member has a role
      const leaderMember = response.data?.getGroup.members[0];
      expect(leaderMember.clientId).toBe('client-1');
      expect(leaderMember.roles).toHaveLength(1);
      expect(leaderMember.roles[0].roleName).toBe('Leader');
    });
  });
  
  describe('Group Loan Management', () => {
    test('should create a loan for a group', async () => {
      const CREATE_LOAN = gql`
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
      
      const variables = {
        request: {
          groupId: "mock-group-id",
          productId: "product-id",
          principal: 10000,
          interestRate: 10.0,
          termFrequency: 12,
          termFrequencyType: "months",
          repaymentEvery: 1,
          repaymentFrequency: 1,
          repaymentFrequencyType: "months",
          interestType: 1,
          interestCalculationPeriodType: 1,
          amortizationType: 1,
          submittedOnDate: "2023-01-01",
          expectedDisbursementDate: "2023-01-15"
        }
      };
      
      const response = await mutate({ mutation: CREATE_LOAN, variables });
      
      expect(response.errors).toBeUndefined();
      expect(response.data?.createGroupLoan.success).toBe(true);
      expect(response.data?.createGroupLoan.loanId).toBe('mock-loan-id');
      expect(response.data?.createGroupLoan.groupId).toBe('mock-group-id');
      expect(response.data?.createGroupLoan.loanStatus).toBe('submitted_and_pending_approval');
    });
    
    test('should approve a loan', async () => {
      const APPROVE_LOAN = gql`
        mutation ApproveLoan($request: ApproveLoanInput!) {
          approveLoan(request: $request) {
            loanId
            success
          }
        }
      `;
      
      const variables = {
        request: {
          loanId: "mock-loan-id",
          approvedOnDate: "2023-01-10",
          approvedLoanAmount: 10000,
          expectedDisbursementDate: "2023-01-15"
        }
      };
      
      const response = await mutate({ mutation: APPROVE_LOAN, variables });
      
      expect(response.errors).toBeUndefined();
      expect(response.data?.approveLoan.success).toBe(true);
      expect(response.data?.approveLoan.loanId).toBe('mock-loan-id');
    });
    
    test('should disburse a loan', async () => {
      const DISBURSE_LOAN = gql`
        mutation DisburseLoan($request: DisburseLoanInput!) {
          disburseLoan(request: $request) {
            loanId
            success
          }
        }
      `;
      
      const variables = {
        request: {
          loanId: "mock-loan-id",
          transactionDate: "2023-01-15",
          actualDisbursementDate: "2023-01-15",
          paymentTypeId: "payment-type-id"
        }
      };
      
      const response = await mutate({ mutation: DISBURSE_LOAN, variables });
      
      expect(response.errors).toBeUndefined();
      expect(response.data?.disburseLoan.success).toBe(true);
      expect(response.data?.disburseLoan.loanId).toBe('mock-loan-id');
    });
    
    test('should make a loan repayment from a group member', async () => {
      const MAKE_REPAYMENT = gql`
        mutation MakeLoanRepayment($request: MakeLoanRepaymentInput!) {
          makeLoanRepayment(request: $request) {
            loanId
            transactionId
            success
          }
        }
      `;
      
      const variables = {
        request: {
          loanId: "mock-loan-id",
          transactionDate: "2023-02-15",
          transactionAmount: 1000,
          paymentTypeId: "payment-type-id",
          clientContributorId: "client-1"
        }
      };
      
      const response = await mutate({ mutation: MAKE_REPAYMENT, variables });
      
      expect(response.errors).toBeUndefined();
      expect(response.data?.makeLoanRepayment.success).toBe(true);
      expect(response.data?.makeLoanRepayment.loanId).toBe('mock-loan-id');
      expect(response.data?.makeLoanRepayment.transactionId).toBe('tx-2');
    });
    
    test('should get loan details for a group', async () => {
      const GET_LOAN_DETAILS = gql`
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
            }
            transactions {
              id
              transactionType
              amount
              transactionDate
              contributorClientId
              contributorClientName
            }
            repaymentSchedule {
              installmentNumber
              dueDate
              totalAmount
              principalAmount
              interestAmount
              completed
            }
            notes {
              note
            }
          }
        }
      `;
      
      const variables = {
        request: {
          groupId: "mock-group-id",
          loanId: "mock-loan-id"
        }
      };
      
      const response = await query({ query: GET_LOAN_DETAILS, variables });
      
      expect(response.errors).toBeUndefined();
      expect(response.data?.getGroupLoanDetails.loanDetails.id).toBe('mock-loan-id');
      expect(response.data?.getGroupLoanDetails.loanDetails.groupId).toBe('mock-group-id');
      expect(response.data?.getGroupLoanDetails.loanDetails.principal).toBe(10000);
      
      // Check transactions
      expect(response.data?.getGroupLoanDetails.transactions).toHaveLength(2);
      const repaymentTx = response.data?.getGroupLoanDetails.transactions[1];
      expect(repaymentTx.transactionType).toBe('repayment');
      expect(repaymentTx.amount).toBe(1000);
      expect(repaymentTx.contributorClientId).toBe('client-1');
      
      // Check repayment schedule
      expect(response.data?.getGroupLoanDetails.repaymentSchedule).toHaveLength(2);
      expect(response.data?.getGroupLoanDetails.repaymentSchedule[0].completed).toBe(true);
      expect(response.data?.getGroupLoanDetails.repaymentSchedule[1].completed).toBe(false);
      
      // Check notes
      expect(response.data?.getGroupLoanDetails.notes).toHaveLength(1);
      expect(response.data?.getGroupLoanDetails.notes[0].note).toBe('Test loan note');
    });
    
    test('should get loan summary for a group', async () => {
      const GET_LOAN_SUMMARY = gql`
        query GetGroupLoanSummary($request: GetGroupLoanSummaryInput!) {
          getGroupLoanSummary(request: $request) {
            statistics {
              totalLoans
              activeLoans
              totalPrincipal
              totalOutstanding
              totalPrincipalRepaid
            }
            recentLoans {
              id
              accountNo
              status
              principal
            }
          }
        }
      `;
      
      const variables = {
        request: {
          groupId: "mock-group-id"
        }
      };
      
      const response = await query({ query: GET_LOAN_SUMMARY, variables });
      
      expect(response.errors).toBeUndefined();
      expect(response.data?.getGroupLoanSummary.statistics.totalLoans).toBe(1);
      expect(response.data?.getGroupLoanSummary.statistics.activeLoans).toBe(1);
      expect(response.data?.getGroupLoanSummary.statistics.totalPrincipal).toBe(10000);
      expect(response.data?.getGroupLoanSummary.statistics.totalOutstanding).toBe(9000);
      expect(response.data?.getGroupLoanSummary.statistics.totalPrincipalRepaid).toBe(1000);
      
      // Check recent loans
      expect(response.data?.getGroupLoanSummary.recentLoans).toHaveLength(1);
      expect(response.data?.getGroupLoanSummary.recentLoans[0].id).toBe('mock-loan-id');
      expect(response.data?.getGroupLoanSummary.recentLoans[0].principal).toBe(10000);
    });
  });
  
  describe('Guarantor Management', () => {
    test('should add a guarantor to a loan', async () => {
      const ADD_GUARANTOR = gql`
        mutation AddLoanGuarantor($request: AddLoanGuarantorInput!) {
          addLoanGuarantor(request: $request) {
            guarantorId
            loanId
            success
          }
        }
      `;
      
      const variables = {
        request: {
          loanId: "mock-loan-id",
          guarantorType: "client",
          clientId: "client-3",
          guaranteedAmount: 2000
        }
      };
      
      const response = await mutate({ mutation: ADD_GUARANTOR, variables });
      
      expect(response.errors).toBeUndefined();
      expect(response.data?.addLoanGuarantor.success).toBe(true);
      expect(response.data?.addLoanGuarantor.loanId).toBe('mock-loan-id');
      expect(response.data?.addLoanGuarantor.guarantorId).toBe('guarantor-1');
    });
    
    test('should get guarantors for a loan', async () => {
      const GET_GUARANTORS = gql`
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
        loanId: "mock-loan-id"
      };
      
      const response = await query({ query: GET_GUARANTORS, variables });
      
      expect(response.errors).toBeUndefined();
      expect(response.data?.getLoanGuarantors.guarantors).toHaveLength(1);
      expect(response.data?.getLoanGuarantors.guarantors[0].id).toBe('guarantor-1');
      expect(response.data?.getLoanGuarantors.guarantors[0].clientId).toBe('client-3');
      expect(response.data?.getLoanGuarantors.guarantors[0].guaranteedAmount).toBe(2000);
    });
    
    test('should get loans guaranteed by a client', async () => {
      const GET_GUARANTEED_LOANS = gql`
        query GetClientGuaranteedLoans($clientId: String!) {
          getClientGuaranteedLoans(clientId: $clientId) {
            guaranteedLoans {
              loanId
              loanAccountNo
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
        clientId: "client-3"
      };
      
      const response = await query({ query: GET_GUARANTEED_LOANS, variables });
      
      expect(response.errors).toBeUndefined();
      expect(response.data?.getClientGuaranteedLoans.guaranteedLoans).toHaveLength(1);
      expect(response.data?.getClientGuaranteedLoans.guaranteedLoans[0].loanId).toBe('mock-loan-id');
      expect(response.data?.getClientGuaranteedLoans.guaranteedLoans[0].groupId).toBe('mock-group-id');
      expect(response.data?.getClientGuaranteedLoans.guaranteedLoans[0].guaranteedAmount).toBe(2000);
      expect(response.data?.getClientGuaranteedLoans.guaranteedLoans[0].loanAmount).toBe(10000);
      expect(response.data?.getClientGuaranteedLoans.guaranteedLoans[0].outstandingAmount).toBe(9000);
    });
  });
});