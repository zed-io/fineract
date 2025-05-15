/**
 * Client test fixtures
 */

export const testClients = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone_number: '+12025550101',
    date_of_birth: '1980-01-15',
    address: {
      street: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zip_code: '12345',
      country: 'US'
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane.smith@example.com',
    phone_number: '+12025550102',
    date_of_birth: '1985-05-20',
    address: {
      street: '456 Oak Ave',
      city: 'Another City',
      state: 'NY',
      zip_code: '54321',
      country: 'US'
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    first_name: 'Robert',
    last_name: 'Johnson',
    email: 'robert.johnson@example.com',
    phone_number: '+12025550103',
    date_of_birth: '1975-10-10',
    address: {
      street: '789 Pine Blvd',
      city: 'Somewhere',
      state: 'TX',
      zip_code: '67890',
      country: 'US'
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

/**
 * Get a test client by index or ID
 * @param indexOrId Index or ID of the client to return
 */
export function getTestClient(indexOrId: number | string) {
  if (typeof indexOrId === 'number') {
    return testClients[indexOrId];
  }
  return testClients.find(client => client.id === indexOrId);
}