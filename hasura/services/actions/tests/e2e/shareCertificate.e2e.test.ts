/**
 * Share Certificate End-to-End Tests
 * Tests the full certificate lifecycle in an integrated environment
 * 
 * Note: These tests require a running test database with the necessary schema and test data.
 * They should be run in a controlled test environment with proper setup and teardown.
 */

// Import dependencies
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// Import application
import app from '../../src/app'; // Adjust based on your app structure

// Mark as end-to-end test (optional, depends on your test setup)
jest.setTimeout(30000); // Longer timeout for E2E tests

// Skip these tests when running in CI or non-E2E mode
const runE2ETests = process.env.RUN_E2E_TESTS === 'true';
const testGroup = runE2ETests ? describe : describe.skip;

testGroup('Share Certificate E2E Tests', () => {
  // Test data - will be populated during test execution
  const testData = {
    authToken: '',
    userId: '',
    productId: '',
    accountId: '',
    templateId: '',
    seriesId: '',
    certificateId: '',
    certificateNumber: '',
    verificationCode: '',
    batchId: ''
  };

  // Setup before all tests
  beforeAll(async () => {
    // Login to get auth token
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({
        username: process.env.TEST_USERNAME || 'testuser',
        password: process.env.TEST_PASSWORD || 'password'
      });
    
    expect(loginResponse.status).toBe(200);
    testData.authToken = loginResponse.body.token;
    testData.userId = loginResponse.body.userId;
    
    // Get a test product and account
    const productsResponse = await request(app)
      .get('/share/products')
      .set('Authorization', `Bearer ${testData.authToken}`);
    
    expect(productsResponse.status).toBe(200);
    expect(productsResponse.body.products.length).toBeGreaterThan(0);
    testData.productId = productsResponse.body.products[0].id;
    
    const accountsResponse = await request(app)
      .get(`/share/accounts?productId=${testData.productId}`)
      .set('Authorization', `Bearer ${testData.authToken}`);
    
    expect(accountsResponse.status).toBe(200);
    expect(accountsResponse.body.accounts.length).toBeGreaterThan(0);
    testData.accountId = accountsResponse.body.accounts[0].id;
    
    // Create a test certificate directory if it doesn't exist
    const certificateDir = path.join(__dirname, '..', '..', 'certificates');
    if (!fs.existsSync(certificateDir)) {
      fs.mkdirSync(certificateDir, { recursive: true });
    }
  });

  // Certificate template management tests
  describe('Template Management', () => {
    test('should create a new certificate template', async () => {
      // Create a new template
      const templateData = {
        name: `Test Template ${new Date().toISOString()}`,
        description: 'Template for E2E testing',
        templateContent: `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Test Certificate</title>
            <style>
              body { font-family: Arial, sans-serif; }
              .certificate { border: 2px solid #000; padding: 20px; }
              .title { font-size: 24px; text-align: center; }
              .details { margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="certificate">
              <div class="title">Share Certificate</div>
              <div class="content">
                <p>This certifies that <strong>{{clientName}}</strong> is the registered holder of 
                <strong>{{sharesQuantity}}</strong> shares.</p>
                
                <div class="details">
                  <p>Certificate Number: {{certificateNumber}}</p>
                  <p>Issue Date: {{issueDate}}</p>
                  <p>Verification Code: {{verificationCode}}</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
        isActive: true,
        isDefault: false
      };
      
      const response = await request(app)
        .post('/share/certificate/template/create')
        .set('Authorization', `Bearer ${testData.authToken}`)
        .send({
          input: templateData,
          session_variables: {
            'x-hasura-user-id': testData.userId
          }
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('templateId');
      testData.templateId = response.body.templateId;
    });
    
    test('should retrieve the created template', async () => {
      const response = await request(app)
        .post('/share/certificate/template')
        .set('Authorization', `Bearer ${testData.authToken}`)
        .send({
          input: { templateId: testData.templateId },
          session_variables: {
            'x-hasura-user-id': testData.userId
          }
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('template');
      expect(response.body.template.id).toBe(testData.templateId);
    });
    
    test('should update the template', async () => {
      const updateData = {
        templateId: testData.templateId,
        name: `Updated Test Template ${new Date().toISOString()}`,
        description: 'Updated template description'
      };
      
      const response = await request(app)
        .post('/share/certificate/template/update')
        .set('Authorization', `Bearer ${testData.authToken}`)
        .send({
          input: updateData,
          session_variables: {
            'x-hasura-user-id': testData.userId
          }
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('updated', true);
      expect(response.body.templateId).toBe(testData.templateId);
    });
  });

  // Certificate series management tests
  describe('Series Management', () => {
    test('should create a new certificate series', async () => {
      const seriesData = {
        productId: testData.productId,
        prefix: `TST${Math.floor(Math.random() * 1000)}`,
        nextNumber: 1,
        isActive: true
      };
      
      const response = await request(app)
        .post('/share/certificate/series/create')
        .set('Authorization', `Bearer ${testData.authToken}`)
        .send({
          input: seriesData,
          session_variables: {
            'x-hasura-user-id': testData.userId
          }
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('seriesId');
      testData.seriesId = response.body.seriesId;
    });
    
    test('should retrieve series for a product', async () => {
      const response = await request(app)
        .post('/share/certificate/series/list')
        .set('Authorization', `Bearer ${testData.authToken}`)
        .send({
          input: { productId: testData.productId },
          session_variables: {
            'x-hasura-user-id': testData.userId
          }
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('seriesList');
      expect(response.body.seriesList.length).toBeGreaterThan(0);
      
      // Verify our series is in the list
      const ourSeries = response.body.seriesList.find(s => s.id === testData.seriesId);
      expect(ourSeries).toBeDefined();
    });
  });

  // Certificate generation tests
  describe('Certificate Generation', () => {
    test('should generate a new certificate', async () => {
      const certData = {
        accountId: testData.accountId,
        templateId: testData.templateId,
        issueDate: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
        sharesQuantity: 100
      };
      
      const response = await request(app)
        .post('/share/certificate/generate')
        .set('Authorization', `Bearer ${testData.authToken}`)
        .send({
          input: certData,
          session_variables: {
            'x-hasura-user-id': testData.userId
          }
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('certificateId');
      expect(response.body).toHaveProperty('certificateNumber');
      expect(response.body).toHaveProperty('downloadUrl');
      
      testData.certificateId = response.body.certificateId;
      testData.certificateNumber = response.body.certificateNumber;
    });
    
    test('should retrieve certificate details', async () => {
      const response = await request(app)
        .post('/share/certificate/certificate')
        .set('Authorization', `Bearer ${testData.authToken}`)
        .send({
          input: { certificateId: testData.certificateId },
          session_variables: {
            'x-hasura-user-id': testData.userId
          }
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('certificate');
      expect(response.body.certificate.id).toBe(testData.certificateId);
      expect(response.body.certificate.certificate_number).toBe(testData.certificateNumber);
      expect(response.body.certificate.verification_code).toBeDefined();
      
      // Save the verification code for later tests
      testData.verificationCode = response.body.certificate.verification_code;
    });
    
    test('should download certificate as PDF', async () => {
      const response = await request(app)
        .get(`/share/certificate/download?id=${testData.certificateId}&format=pdf`)
        .set('Authorization', `Bearer ${testData.authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toContain(`filename="${testData.certificateNumber}.pdf"`);
      expect(response.body).toBeDefined();
    });
    
    test('should list all certificates for an account', async () => {
      const response = await request(app)
        .post('/share/certificate/certificates')
        .set('Authorization', `Bearer ${testData.authToken}`)
        .send({
          input: { accountId: testData.accountId },
          session_variables: {
            'x-hasura-user-id': testData.userId
          }
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('certificates');
      expect(response.body.certificates.length).toBeGreaterThan(0);
      
      // Verify our certificate is in the list
      const ourCertificate = response.body.certificates.find(c => c.id === testData.certificateId);
      expect(ourCertificate).toBeDefined();
    });
  });

  // Certificate verification tests
  describe('Certificate Verification', () => {
    test('should verify a valid certificate', async () => {
      const verifyData = {
        certificateNumber: testData.certificateNumber,
        verificationCode: testData.verificationCode
      };
      
      const response = await request(app)
        .post('/share/certificate/verify')
        .send({
          input: verifyData
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('isValid', true);
      expect(response.body).toHaveProperty('certificate');
      expect(response.body).toHaveProperty('message', 'Certificate is valid');
    });
    
    test('should reject certificate with invalid verification code', async () => {
      const verifyData = {
        certificateNumber: testData.certificateNumber,
        verificationCode: 'WRONGCODE'
      };
      
      const response = await request(app)
        .post('/share/certificate/verify')
        .send({
          input: verifyData
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('isValid', false);
      expect(response.body).toHaveProperty('message', 'Certificate not found or verification code is incorrect');
    });
  });

  // Certificate lifecycle tests
  describe('Certificate Lifecycle', () => {
    test('should revoke a certificate', async () => {
      const revocationData = {
        certificateId: testData.certificateId,
        revocationDate: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
        reason: 'E2E test revocation'
      };
      
      const response = await request(app)
        .post('/share/certificate/revoke')
        .set('Authorization', `Bearer ${testData.authToken}`)
        .send({
          input: revocationData,
          session_variables: {
            'x-hasura-user-id': testData.userId
          }
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('certificateId', testData.certificateId);
      expect(response.body).toHaveProperty('status', 'revoked');
    });
    
    test('should verify that revoked certificate is invalid', async () => {
      const verifyData = {
        certificateNumber: testData.certificateNumber,
        verificationCode: testData.verificationCode
      };
      
      const response = await request(app)
        .post('/share/certificate/verify')
        .send({
          input: verifyData
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('isValid', false);
      expect(response.body).toHaveProperty('certificate');
      expect(response.body.certificate.status).toBe('revoked');
      expect(response.body).toHaveProperty('message', 'Certificate is not active. Current status: revoked');
    });
    
    test('should regenerate a certificate for the revoked one', async () => {
      const regenerateData = {
        certificateId: testData.certificateId,
        newIssueDate: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
        notes: 'Regenerated in E2E test'
      };
      
      const response = await request(app)
        .post('/share/certificate/regenerate')
        .set('Authorization', `Bearer ${testData.authToken}`)
        .send({
          input: regenerateData,
          session_variables: {
            'x-hasura-user-id': testData.userId
          }
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('originalCertificateId', testData.certificateId);
      expect(response.body).toHaveProperty('newCertificateId');
      expect(response.body).toHaveProperty('newCertificateNumber');
      expect(response.body).toHaveProperty('status', 'active');
      expect(response.body).toHaveProperty('downloadUrl');
      
      // Update test data for the new certificate
      testData.certificateId = response.body.newCertificateId;
      testData.certificateNumber = response.body.newCertificateNumber;
    });
    
    test('should verify that original certificate status is now replaced', async () => {
      const oldCertificateId = testData.certificateId;
      
      const response = await request(app)
        .post('/share/certificate/certificate')
        .set('Authorization', `Bearer ${testData.authToken}`)
        .send({
          input: { certificateId: oldCertificateId },
          session_variables: {
            'x-hasura-user-id': testData.userId
          }
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('certificate');
      expect(response.body.certificate.id).toBe(oldCertificateId);
      expect(response.body.certificate.status).toBe('replaced');
    });
  });

  // Batch certificate operations tests
  describe('Batch Certificate Operations', () => {
    test('should start a batch certificate generation', async () => {
      // Create a batch with specific accounts
      const batchData = {
        accountIds: [testData.accountId], // Just include our test account
        templateId: testData.templateId,
        seriesId: testData.seriesId
      };
      
      const response = await request(app)
        .post('/share/certificate/batch/start')
        .set('Authorization', `Bearer ${testData.authToken}`)
        .send({
          input: batchData,
          session_variables: {
            'x-hasura-user-id': testData.userId
          }
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('batchId');
      expect(response.body).toHaveProperty('status', 'pending');
      expect(response.body).toHaveProperty('totalAccounts', 1);
      
      testData.batchId = response.body.batchId;
    });
    
    test('should retrieve batch details', async () => {
      const response = await request(app)
        .post('/share/certificate/batch')
        .set('Authorization', `Bearer ${testData.authToken}`)
        .send({
          input: { batchId: testData.batchId },
          session_variables: {
            'x-hasura-user-id': testData.userId
          }
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('batch');
      expect(response.body.batch.id).toBe(testData.batchId);
      expect(response.body.batch).toHaveProperty('items');
      expect(response.body.batch.items.length).toBe(1);
      expect(response.body.batch.items[0].account_id).toBe(testData.accountId);
    });
    
    test('should list all certificate batches', async () => {
      const response = await request(app)
        .post('/share/certificate/batches')
        .set('Authorization', `Bearer ${testData.authToken}`)
        .send({
          session_variables: {
            'x-hasura-user-id': testData.userId
          }
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('batches');
      expect(response.body.batches.length).toBeGreaterThan(0);
      
      // Verify our batch is in the list
      const ourBatch = response.body.batches.find(b => b.id === testData.batchId);
      expect(ourBatch).toBeDefined();
    });
  });

  // Error handling and validation tests
  describe('Error Handling and Validation', () => {
    test('should validate certificate generation inputs', async () => {
      const invalidData = {
        // Missing required accountId
        templateId: testData.templateId,
        issueDate: new Date().toISOString().split('T')[0],
        sharesQuantity: 100
      };
      
      const response = await request(app)
        .post('/share/certificate/generate')
        .set('Authorization', `Bearer ${testData.authToken}`)
        .send({
          input: invalidData,
          session_variables: {
            'x-hasura-user-id': testData.userId
          }
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });
    
    test('should prevent revocation of already revoked certificates', async () => {
      // Try to revoke the already replaced certificate
      const revocationData = {
        certificateId: testData.certificateId, // This is now the new certificate ID
        revocationDate: new Date().toISOString().split('T')[0],
        reason: 'Second revocation attempt'
      };
      
      // First revoke the certificate
      await request(app)
        .post('/share/certificate/revoke')
        .set('Authorization', `Bearer ${testData.authToken}`)
        .send({
          input: revocationData,
          session_variables: {
            'x-hasura-user-id': testData.userId
          }
        });
      
      // Try to revoke it again
      const response = await request(app)
        .post('/share/certificate/revoke')
        .set('Authorization', `Bearer ${testData.authToken}`)
        .send({
          input: revocationData,
          session_variables: {
            'x-hasura-user-id': testData.userId
          }
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Certificate is not active and cannot be revoked. Current status: revoked');
    });
    
    test('should prevent creating duplicate series prefixes', async () => {
      // Get the prefix from our existing series
      const seriesResponse = await request(app)
        .post('/share/certificate/series/list')
        .set('Authorization', `Bearer ${testData.authToken}`)
        .send({
          input: { productId: testData.productId },
          session_variables: {
            'x-hasura-user-id': testData.userId
          }
        });
      
      const existingSeries = seriesResponse.body.seriesList.find(s => s.id === testData.seriesId);
      expect(existingSeries).toBeDefined();
      
      // Try to create a new series with the same prefix
      const duplicateSeriesData = {
        productId: testData.productId,
        prefix: existingSeries.prefix,
        nextNumber: 1
      };
      
      const response = await request(app)
        .post('/share/certificate/series/create')
        .set('Authorization', `Bearer ${testData.authToken}`)
        .send({
          input: duplicateSeriesData,
          session_variables: {
            'x-hasura-user-id': testData.userId
          }
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', `A certificate series with prefix '${existingSeries.prefix}' already exists for this product`);
    });
  });

  // Performance tests (if applicable to your environment)
  describe('Performance Tests', () => {
    test('should handle concurrent certificate verification requests', async () => {
      // Create an array of 5 concurrent verification requests
      const verifyRequests = Array(5).fill(null).map(() => {
        return request(app)
          .post('/share/certificate/verify')
          .send({
            input: {
              certificateNumber: testData.certificateNumber,
              verificationCode: testData.verificationCode
            }
          });
      });
      
      // Execute all requests concurrently
      const responses = await Promise.all(verifyRequests);
      
      // Check all responses
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('isValid');
      });
    });
  });

  // Clean up after all tests if needed
  afterAll(async () => {
    // You might want to clean up test data created during the tests
    // This depends on your testing strategy and environment
  });
});