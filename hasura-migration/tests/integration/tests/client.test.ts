import { createTestContext, TestContext } from '@utils/test-context';
import { loginTestUser } from '@helpers/auth-helper';
import { generateClientData } from '@helpers/data-generator';
import { CREATE_CLIENT, UPDATE_CLIENT, DELETE_CLIENT } from '@graphql/mutations';
import { GET_CLIENT, GET_CLIENTS } from '@graphql/queries';
import { query, adminMutate } from '@utils/graphql-client';

describe('Client API Integration Tests', () => {
  let context: TestContext;
  let clientId: string;

  // Setup test context and login before tests
  beforeAll(async () => {
    // Create and initialize test context
    context = await createTestContext();
    
    // Login with test user
    await loginTestUser(context);
  });

  // Cleanup after all tests
  afterAll(async () => {
    await context.cleanup();
  });

  it('should create a new client', async () => {
    // Generate test client data
    const clientData = generateClientData();
    
    // Create client using GraphQL mutation
    const response = await query<{ createClient: any }>(CREATE_CLIENT, {
      input: {
        first_name: clientData.first_name,
        last_name: clientData.last_name,
        email: clientData.email,
        phone_number: clientData.phone_number,
        date_of_birth: clientData.date_of_birth,
        address: clientData.address
      }
    });
    
    // Store client ID for later tests
    clientId = response.createClient.id;
    
    // Track entity for cleanup
    context.trackEntity('clients', clientId);
    
    // Assertions
    expect(response.createClient).toBeDefined();
    expect(response.createClient.id).toBeDefined();
    expect(response.createClient.first_name).toBe(clientData.first_name);
    expect(response.createClient.last_name).toBe(clientData.last_name);
    expect(response.createClient.email).toBe(clientData.email);
  });

  it('should get a client by ID', async () => {
    // Skip if client wasn't created
    if (!clientId) {
      console.warn('Skipping test because client ID is not available');
      return;
    }
    
    // Fetch client by ID
    const response = await query<{ client: any }>(GET_CLIENT, { id: clientId });
    
    // Assertions
    expect(response.client).toBeDefined();
    expect(response.client.id).toBe(clientId);
  });

  it('should update a client', async () => {
    // Skip if client wasn't created
    if (!clientId) {
      console.warn('Skipping test because client ID is not available');
      return;
    }
    
    // Update data
    const updateData = {
      first_name: 'Updated',
      last_name: 'Client',
      phone_number: '+12345678901'
    };
    
    // Update client
    const response = await query<{ updateClient: any }>(UPDATE_CLIENT, {
      id: clientId,
      input: updateData
    });
    
    // Assertions
    expect(response.updateClient).toBeDefined();
    expect(response.updateClient.first_name).toBe(updateData.first_name);
    expect(response.updateClient.last_name).toBe(updateData.last_name);
    expect(response.updateClient.phone_number).toBe(updateData.phone_number);
  });

  it('should list clients with pagination', async () => {
    // Fetch clients with pagination
    const response = await query<{ clients: any[] }>(GET_CLIENTS, {
      limit: 10,
      offset: 0
    });
    
    // Assertions
    expect(response.clients).toBeDefined();
    expect(Array.isArray(response.clients)).toBe(true);
  });

  it('should delete a client', async () => {
    // Skip if client wasn't created
    if (!clientId) {
      console.warn('Skipping test because client ID is not available');
      return;
    }
    
    // Delete client
    const response = await query<{ deleteClient: { success: boolean; message: string } }>(
      DELETE_CLIENT,
      { id: clientId }
    );
    
    // Assertions
    expect(response.deleteClient).toBeDefined();
    expect(response.deleteClient.success).toBe(true);
    
    // Verify client is deleted
    try {
      await query<{ client: any }>(GET_CLIENT, { id: clientId });
      fail('Expected client to be deleted');
    } catch (error) {
      // Error is expected
      expect(error).toBeDefined();
    }
  });
});