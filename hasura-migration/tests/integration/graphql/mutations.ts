import { gql } from '@utils/graphql-client';

// Client mutations
export const CREATE_CLIENT = gql`
  mutation CreateClient($input: ClientInput!) {
    createClient(input: $input) {
      id
      first_name
      last_name
      email
      phone_number
      date_of_birth
      created_at
    }
  }
`;

export const UPDATE_CLIENT = gql`
  mutation UpdateClient($id: ID!, $input: ClientUpdateInput!) {
    updateClient(id: $id, input: $input) {
      id
      first_name
      last_name
      email
      phone_number
      updated_at
    }
  }
`;

export const DELETE_CLIENT = gql`
  mutation DeleteClient($id: ID!) {
    deleteClient(id: $id) {
      success
      message
    }
  }
`;

// Loan mutations
export const CREATE_LOAN_APPLICATION = gql`
  mutation CreateLoanApplication($input: LoanApplicationInput!) {
    createLoanApplication(input: $input) {
      id
      client_id
      loan_product_id
      principal_amount
      term_months
      interest_rate
      status
      purpose
      created_at
    }
  }
`;

export const UPDATE_LOAN_APPLICATION = gql`
  mutation UpdateLoanApplication($id: ID!, $input: LoanApplicationUpdateInput!) {
    updateLoanApplication(id: $id, input: $input) {
      id
      status
      updated_at
    }
  }
`;

// Recurring deposit mutations
export const CREATE_RECURRING_DEPOSIT = gql`
  mutation CreateRecurringDeposit($input: RecurringDepositInput!) {
    createRecurringDeposit(input: $input) {
      id
      client_id
      deposit_amount
      frequency
      interest_rate
      term_months
      status
      start_date
      maturity_date
      created_at
    }
  }
`;

export const UPDATE_RECURRING_DEPOSIT = gql`
  mutation UpdateRecurringDeposit($id: ID!, $input: RecurringDepositUpdateInput!) {
    updateRecurringDeposit(id: $id, input: $input) {
      id
      deposit_amount
      status
      updated_at
    }
  }
`;