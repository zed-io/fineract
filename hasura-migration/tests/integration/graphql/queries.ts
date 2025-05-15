import { gql } from '@utils/graphql-client';

// Client queries
export const GET_CLIENT = gql`
  query GetClient($id: ID!) {
    client(id: $id) {
      id
      first_name
      last_name
      email
      phone_number
      date_of_birth
      created_at
      updated_at
    }
  }
`;

export const GET_CLIENTS = gql`
  query GetClients($limit: Int, $offset: Int) {
    clients(limit: $limit, offset: $offset) {
      id
      first_name
      last_name
      email
      created_at
    }
  }
`;

// Loan queries
export const GET_LOAN_APPLICATION = gql`
  query GetLoanApplication($id: ID!) {
    loanApplication(id: $id) {
      id
      client_id
      loan_product_id
      principal_amount
      term_months
      interest_rate
      status
      purpose
      created_at
      updated_at
    }
  }
`;

export const GET_LOAN_APPLICATIONS = gql`
  query GetLoanApplications($clientId: ID, $status: String, $limit: Int, $offset: Int) {
    loanApplications(
      client_id: $clientId, 
      status: $status, 
      limit: $limit, 
      offset: $offset
    ) {
      id
      client_id
      principal_amount
      status
      created_at
    }
  }
`;

// Recurring deposit queries
export const GET_RECURRING_DEPOSIT = gql`
  query GetRecurringDeposit($id: ID!) {
    recurringDeposit(id: $id) {
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
      updated_at
    }
  }
`;

export const GET_RECURRING_DEPOSITS = gql`
  query GetRecurringDeposits($clientId: ID, $status: String, $limit: Int, $offset: Int) {
    recurringDeposits(
      client_id: $clientId, 
      status: $status, 
      limit: $limit, 
      offset: $offset
    ) {
      id
      client_id
      deposit_amount
      status
      start_date
      maturity_date
    }
  }
`;