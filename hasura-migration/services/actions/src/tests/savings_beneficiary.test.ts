import { expect } from 'chai';
import request from 'supertest';
import express from 'express';
import { json } from 'body-parser';
import { savingsBeneficiaryRoutes } from '../handlers/savings_beneficiary';

// Mock DB and utils
jest.mock('../utils/db', () => ({
  getClient: jest.fn().mockImplementation(() => ({
    query: jest.fn().mockImplementation((query, params) => {
      // Mock responses for various queries
      if (query.includes('INSERT INTO savings_account_beneficiary')) {
        return { rows: [] };
      } else if (query.includes('UPDATE savings_account_beneficiary')) {
        return { rows: [] };
      } else if (query.includes('DELETE FROM savings_account_beneficiary')) {
        return { rows: [] };
      } else if (query.includes('SELECT') && params && params[0] === 'test-account-id') {
        return {
          rows: [
            {
              id: 'test-account-id',
              account_no: 'S-001-2305-000001',
              client_id: 'test-client-id',
              status: 'active',
              client_name: 'Test Client'
            }
          ]
        };
      } else if (query.includes('SELECT') && query.includes('COALESCE(SUM(percentage_share)')) {
        return { rows: [{ total_percentage: 0 }] };
      } else if (query.includes('SELECT') && params && params[0] === 'test-beneficiary-id') {
        return {
          rows: [
            {
              id: 'test-beneficiary-id',
              savings_account_id: 'test-account-id',
              name: 'Test Beneficiary',
              relationship_type: 'spouse',
              percentage_share: 50,
              is_active: true,
              account_status: 'active',
              account_no: 'S-001-2305-000001',
              client_name: 'Test Client'
            }
          ]
        };
      } else if (query.includes('SELECT') && query.includes('savings_account_beneficiary')) {
        return {
          rows: [
            {
              id: 'test-beneficiary-id',
              name: 'Test Beneficiary',
              relationship_type: 'spouse',
              percentage_share: 50,
              address: '123 Main St',
              contact_number: '1234567890',
              email: 'test@example.com',
              identification_type: 'national_id',
              identification_number: 'ID12345',
              is_active: true,
              created_date: new Date().toISOString()
            }
          ]
        };
      }
      return { rows: [] };
    }),
    release: jest.fn(),
    query: jest.fn().mockReturnValue({ rows: [] })
  }))
}));

jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

// Setup express app for testing
const app = express();
app.use(json());
app.use('/api/v1/savings/beneficiary', savingsBeneficiaryRoutes);

describe('Savings Beneficiary API', () => {
  
  describe('POST /add', () => {
    it('should add a beneficiary successfully', async () => {
      const response = await request(app)
        .post('/api/v1/savings/beneficiary/add')
        .send({
          input: {
            accountId: 'test-account-id',
            name: 'Test Beneficiary',
            relationshipType: 'spouse',
            percentageShare: 50,
            address: '123 Main St',
            contactNumber: '1234567890',
            email: 'test@example.com'
          }
        });
      
      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.name).to.equal('Test Beneficiary');
      expect(response.body.percentageShare).to.equal(50);
    });
    
    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/savings/beneficiary/add')
        .send({
          input: {
            accountId: 'test-account-id',
            // Missing name and other required fields
            percentageShare: 50
          }
        });
      
      expect(response.status).to.equal(400);
    });
  });
  
  describe('POST /update', () => {
    it('should update a beneficiary successfully', async () => {
      const response = await request(app)
        .post('/api/v1/savings/beneficiary/update')
        .send({
          input: {
            beneficiaryId: 'test-beneficiary-id',
            name: 'Updated Name',
            percentageShare: 75
          }
        });
      
      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
    });
    
    it('should require a beneficiary ID', async () => {
      const response = await request(app)
        .post('/api/v1/savings/beneficiary/update')
        .send({
          input: {
            // Missing beneficiaryId
            name: 'Updated Name',
            percentageShare: 75
          }
        });
      
      expect(response.status).to.equal(400);
    });
  });
  
  describe('POST /remove', () => {
    it('should remove a beneficiary successfully', async () => {
      const response = await request(app)
        .post('/api/v1/savings/beneficiary/remove')
        .send({
          input: {
            beneficiaryId: 'test-beneficiary-id',
            softDelete: true
          }
        });
      
      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
    });
    
    it('should require a beneficiary ID', async () => {
      const response = await request(app)
        .post('/api/v1/savings/beneficiary/remove')
        .send({
          input: {
            // Missing beneficiaryId
            softDelete: true
          }
        });
      
      expect(response.status).to.equal(400);
    });
  });
  
  describe('POST /list', () => {
    it('should list beneficiaries for an account', async () => {
      const response = await request(app)
        .post('/api/v1/savings/beneficiary/list')
        .send({
          input: {
            accountId: 'test-account-id',
            includeInactive: false
          }
        });
      
      expect(response.status).to.equal(200);
      expect(response.body.totalCount).to.be.a('number');
      expect(response.body.beneficiaries).to.be.an('array');
    });
    
    it('should require an account ID', async () => {
      const response = await request(app)
        .post('/api/v1/savings/beneficiary/list')
        .send({
          input: {
            // Missing accountId
            includeInactive: false
          }
        });
      
      expect(response.status).to.equal(400);
    });
  });
});