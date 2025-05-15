/**
 * Share Certificate Integration Tests
 * Tests the full API lifecycle of certificate operations
 */

import request from 'supertest';
import app from '../../src/app'; // Adjust based on your app structure
import { initDatabase } from '../../src/utils/db';
import { shareService } from '../../src/services/shareService';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

// Mock dependencies
jest.mock('../../src/utils/db');
jest.mock('../../src/services/shareService');
jest.mock('puppeteer');
jest.mock('fs');

describe('Share Certificate Integration Tests', () => {
  // Mock JWT token for authentication
  const mockAuthToken = 'mock-auth-token';
  
  // Mock database client
  const mockDb = {
    query: jest.fn(),
  };
  
  // Test data
  const testData = {
    userId: uuidv4(),
    productId: uuidv4(),
    accountId: uuidv4(),
    templateId: uuidv4(),
    seriesId: uuidv4(),
    certificateId: uuidv4(),
    certificateNumber: 'SHR000001',
    verificationCode: 'ABC123',
    batchId: uuidv4()
  };

  beforeAll(async () => {
    // Setup mock database
    (initDatabase as jest.Mock).mockResolvedValue(mockDb);
    
    // Mock filesystem operations
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    
    const mockFileStream = {
      pipe: jest.fn((res) => res.end())
    };
    (fs.createReadStream as jest.Mock).mockReturnValue(mockFileStream);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Template Management', () => {
    test('GET /templates should return all certificate templates', async () => {
      // Arrange
      const mockTemplates = [
        { id: testData.templateId, name: 'Template 1' },
        { id: uuidv4(), name: 'Template 2' }
      ];
      mockDb.query.mockResolvedValueOnce(mockTemplates);

      // Act
      const response = await request(app)
        .post('/share/certificate/templates')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({});

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('templates');
      expect(response.body.templates).toHaveLength(2);
    });

    test('POST /template/create should create a new template', async () => {
      // Arrange
      const templateData = {
        name: 'New Test Template',
        description: 'Template for testing',
        templateContent: '<html>Test template content</html>',
        isDefault: false
      };
      
      mockDb.query.mockImplementation((query) => {
        if (query.includes('INSERT INTO')) {
          return Promise.resolve();
        }
        return Promise.resolve([]);
      });

      // Act
      const response = await request(app)
        .post('/share/certificate/template/create')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          input: templateData,
          session_variables: {
            'x-hasura-user-id': testData.userId
          }
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('templateId');
      expect(response.body.name).toBe(templateData.name);
    });

    test('POST /template/update should update an existing template', async () => {
      // Arrange
      const updateData = {
        templateId: testData.templateId,
        name: 'Updated Template Name',
        isActive: true
      };
      
      mockDb.query.mockImplementation((query) => {
        if (query.includes('SELECT * FROM share_certificate_template')) {
          return Promise.resolve([{ id: testData.templateId, name: 'Old Name' }]);
        }
        return Promise.resolve();
      });

      // Act
      const response = await request(app)
        .post('/share/certificate/template/update')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          input: updateData,
          session_variables: {
            'x-hasura-user-id': testData.userId
          }
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('updated', true);
      expect(response.body.templateId).toBe(testData.templateId);
      expect(response.body.name).toBe(updateData.name);
    });
  });

  describe('Series Management', () => {
    test('POST /series/list should return all series for a product', async () => {
      // Arrange
      const mockSeries = [
        { id: testData.seriesId, product_id: testData.productId, prefix: 'SHR' },
        { id: uuidv4(), product_id: testData.productId, prefix: 'CERT' }
      ];
      
      (shareService.getProduct as jest.Mock).mockResolvedValueOnce({ 
        id: testData.productId, 
        name: 'Test Product' 
      });
      
      mockDb.query.mockResolvedValueOnce(mockSeries);

      // Act
      const response = await request(app)
        .post('/share/certificate/series/list')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          input: { productId: testData.productId }
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('seriesList');
      expect(response.body.seriesList).toHaveLength(2);
    });

    test('POST /series/create should create a new certificate series', async () => {
      // Arrange
      const seriesData = {
        productId: testData.productId,
        prefix: 'SHARE',
        nextNumber: 1
      };
      
      (shareService.getProduct as jest.Mock).mockResolvedValueOnce({ 
        id: testData.productId, 
        name: 'Test Product' 
      });
      
      mockDb.query.mockImplementation((query) => {
        if (query.includes('SELECT * FROM share_certificate_series')) {
          return Promise.resolve([]);
        }
        return Promise.resolve();
      });

      // Act
      const response = await request(app)
        .post('/share/certificate/series/create')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          input: seriesData,
          session_variables: {
            'x-hasura-user-id': testData.userId
          }
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('seriesId');
      expect(response.body.prefix).toBe(seriesData.prefix);
    });
  });

  describe('Certificate Generation and Lifecycle', () => {
    test('POST /generate should create a new certificate', async () => {
      // Arrange
      const certData = {
        accountId: testData.accountId,
        templateId: testData.templateId,
        issueDate: '2023-01-01',
        sharesQuantity: 100
      };
      
      // Mock account, template, series, etc.
      (shareService.getAccount as jest.Mock).mockResolvedValueOnce({ 
        id: testData.accountId, 
        productId: testData.productId,
        productName: 'Test Product',
        clientName: 'Test Client',
        accountNo: 'ACC001'
      });
      
      mockDb.query.mockImplementation((query) => {
        if (query.includes('SELECT * FROM share_certificate_series')) {
          return Promise.resolve([{ 
            id: testData.seriesId, 
            prefix: 'SHR', 
            next_number: 1 
          }]);
        }
        if (query.includes('SELECT id FROM share_certificate_template')) {
          return Promise.resolve([{ id: testData.templateId }]);
        }
        return Promise.resolve();
      });
      
      // Mock the certificate generation process
      const downloadUrl = `/api/share/certificate/download?id=${testData.certificateId}&format=pdf`;
      jest.spyOn(global.Math, 'random').mockReturnValue(0.5);
      
      // Act
      const response = await request(app)
        .post('/share/certificate/generate')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          input: certData,
          session_variables: {
            'x-hasura-user-id': testData.userId
          }
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('certificateId');
      expect(response.body).toHaveProperty('certificateNumber');
      expect(response.body).toHaveProperty('downloadUrl');
      expect(response.body.accountId).toBe(certData.accountId);
      expect(response.body.sharesQuantity).toBe(certData.sharesQuantity);
      
      // Restore Math.random
      jest.spyOn(global.Math, 'random').mockRestore();
    });

    test('POST /certificate should retrieve certificate details', async () => {
      // Arrange
      const mockCertificate = { 
        id: testData.certificateId, 
        certificate_number: testData.certificateNumber, 
        account_id: testData.accountId,
        status: 'active'
      };
      
      mockDb.query.mockResolvedValueOnce([mockCertificate]);

      // Act
      const response = await request(app)
        .post('/share/certificate/certificate')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          input: { certificateId: testData.certificateId }
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('certificate');
      expect(response.body.certificate.id).toBe(testData.certificateId);
    });

    test('POST /certificates should retrieve all certificates for an account', async () => {
      // Arrange
      const mockCertificates = [
        { id: testData.certificateId, certificate_number: testData.certificateNumber, account_id: testData.accountId },
        { id: uuidv4(), certificate_number: 'SHR000002', account_id: testData.accountId }
      ];
      
      (shareService.getAccount as jest.Mock).mockResolvedValueOnce({ id: testData.accountId });
      mockDb.query.mockResolvedValueOnce(mockCertificates);

      // Act
      const response = await request(app)
        .post('/share/certificate/certificates')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          input: { accountId: testData.accountId }
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('certificates');
      expect(response.body.certificates).toHaveLength(2);
    });

    test('POST /revoke should revoke an active certificate', async () => {
      // Arrange
      const revocationData = {
        certificateId: testData.certificateId,
        revocationDate: '2023-02-01',
        reason: 'Certificate lost'
      };
      
      mockDb.query.mockImplementation((query) => {
        if (query.includes('SELECT')) {
          return Promise.resolve([{ 
            id: testData.certificateId, 
            certificate_number: testData.certificateNumber, 
            status: 'active'
          }]);
        }
        return Promise.resolve();
      });

      // Act
      const response = await request(app)
        .post('/share/certificate/revoke')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          input: revocationData,
          session_variables: {
            'x-hasura-user-id': testData.userId
          }
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('certificateId', testData.certificateId);
      expect(response.body).toHaveProperty('status', 'revoked');
      expect(response.body).toHaveProperty('revocationDate', revocationData.revocationDate);
    });

    test('POST /regenerate should create a replacement certificate', async () => {
      // Arrange
      const regenerateData = {
        certificateId: testData.certificateId,
        newIssueDate: '2023-02-15',
        notes: 'Replacement for lost certificate'
      };
      
      const newCertificateId = uuidv4();
      const newCertificateNumber = 'SHR000002';
      
      mockDb.query.mockImplementation((query) => {
        if (query.includes('SELECT') && !query.includes('SELECT * FROM share_certificate_series')) {
          return Promise.resolve([{ 
            id: testData.certificateId, 
            certificate_number: testData.certificateNumber, 
            status: 'revoked',
            account_id: testData.accountId,
            shares_quantity: 100
          }]);
        }
        return Promise.resolve();
      });

      // Act
      const response = await request(app)
        .post('/share/certificate/regenerate')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          input: regenerateData,
          session_variables: {
            'x-hasura-user-id': testData.userId
          }
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('originalCertificateId', testData.certificateId);
      expect(response.body).toHaveProperty('newCertificateId');
      expect(response.body).toHaveProperty('newCertificateNumber');
      expect(response.body).toHaveProperty('status', 'active');
      expect(response.body).toHaveProperty('downloadUrl');
    });
  });

  describe('Certificate Download and Verification', () => {
    test('POST /download should return download URL for a certificate', async () => {
      // Arrange
      const downloadData = {
        certificateId: testData.certificateId,
        format: 'pdf'
      };
      
      mockDb.query.mockImplementation((query) => {
        if (query.includes('SELECT')) {
          return Promise.resolve([{ 
            id: testData.certificateId, 
            certificate_number: testData.certificateNumber,
            document_path: '/path/to/certificate.pdf'
          }]);
        }
        return Promise.resolve();
      });

      // Act
      const response = await request(app)
        .post('/share/certificate/download')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          input: downloadData
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('certificateId', testData.certificateId);
      expect(response.body).toHaveProperty('downloadUrl');
      expect(response.body).toHaveProperty('format', 'pdf');
    });

    test('GET /download should stream certificate file', async () => {
      // Arrange
      mockDb.query.mockImplementation((query) => {
        if (query.includes('SELECT')) {
          return Promise.resolve([{ 
            id: testData.certificateId, 
            certificate_number: testData.certificateNumber,
            document_path: '/path/to/certificate.pdf'
          }]);
        }
        return Promise.resolve();
      });

      // Act
      const response = await request(app)
        .get(`/share/certificate/download?id=${testData.certificateId}&format=pdf`)
        .set('Authorization', `Bearer ${mockAuthToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toContain(`filename="${testData.certificateNumber}.pdf"`);
    });

    test('POST /verify should verify a valid certificate', async () => {
      // Arrange
      const verifyData = {
        certificateNumber: testData.certificateNumber,
        verificationCode: testData.verificationCode
      };
      
      mockDb.query.mockResolvedValueOnce([{ 
        id: testData.certificateId, 
        certificate_number: testData.certificateNumber, 
        status: 'active',
        expiry_date: null
      }]);

      // Act
      const response = await request(app)
        .post('/share/certificate/verify')
        .send({
          input: verifyData
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('isValid', true);
      expect(response.body).toHaveProperty('certificate');
      expect(response.body).toHaveProperty('message', 'Certificate is valid');
    });

    test('POST /verify should handle invalid verification codes', async () => {
      // Arrange
      const verifyData = {
        certificateNumber: testData.certificateNumber,
        verificationCode: 'WRONG'
      };
      
      mockDb.query.mockResolvedValueOnce([]);

      // Act
      const response = await request(app)
        .post('/share/certificate/verify')
        .send({
          input: verifyData
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('isValid', false);
      expect(response.body).toHaveProperty('message', 'Certificate not found or verification code is incorrect');
    });
  });

  describe('Batch Certificate Operations', () => {
    test('POST /batches should return all certificate batches', async () => {
      // Arrange
      const mockBatches = [
        { id: testData.batchId, status: 'completed', total_certificates: 10 },
        { id: uuidv4(), status: 'pending', total_certificates: 5 }
      ];
      
      mockDb.query.mockResolvedValueOnce(mockBatches);

      // Act
      const response = await request(app)
        .post('/share/certificate/batches')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({});

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('batches');
      expect(response.body.batches).toHaveLength(2);
    });

    test('POST /batch should return details for a specific batch', async () => {
      // Arrange
      const mockBatch = { 
        id: testData.batchId, 
        status: 'completed', 
        total_certificates: 3 
      };
      
      const mockItems = [
        { id: uuidv4(), batch_id: testData.batchId, account_id: testData.accountId, status: 'completed' },
        { id: uuidv4(), batch_id: testData.batchId, account_id: uuidv4(), status: 'completed' },
        { id: uuidv4(), batch_id: testData.batchId, account_id: uuidv4(), status: 'completed' }
      ];
      
      mockDb.query.mockResolvedValueOnce([mockBatch]).mockResolvedValueOnce(mockItems);

      // Act
      const response = await request(app)
        .post('/share/certificate/batch')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          input: { batchId: testData.batchId }
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('batch');
      expect(response.body.batch.id).toBe(testData.batchId);
      expect(response.body.batch).toHaveProperty('items');
      expect(response.body.batch.items).toHaveLength(3);
    });

    test('POST /batch/start should initiate a new certificate batch', async () => {
      // Arrange
      const batchData = {
        productId: testData.productId,
        templateId: testData.templateId,
        seriesId: testData.seriesId
      };
      
      mockDb.query.mockImplementation((query) => {
        if (query.includes('BEGIN') || query.includes('COMMIT')) {
          return Promise.resolve();
        }
        if (query.includes('WHERE a.product_id = $1')) {
          return Promise.resolve([
            { id: testData.accountId, status: 'active' },
            { id: uuidv4(), status: 'active' }
          ]);
        }
        return Promise.resolve();
      });

      // Act
      const response = await request(app)
        .post('/share/certificate/batch/start')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          input: batchData,
          session_variables: {
            'x-hasura-user-id': testData.userId
          }
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('batchId');
      expect(response.body).toHaveProperty('status', 'pending');
      expect(response.body).toHaveProperty('totalAccounts', 2);
    });

    test('POST /batch/start should handle case with specific account IDs', async () => {
      // Arrange
      const accountIds = [testData.accountId, uuidv4(), uuidv4()];
      const batchData = {
        accountIds,
        templateId: testData.templateId,
        seriesId: testData.seriesId
      };
      
      mockDb.query.mockImplementation((query) => {
        if (query.includes('BEGIN') || query.includes('COMMIT')) {
          return Promise.resolve();
        }
        if (query.includes('WHERE a.id IN')) {
          return Promise.resolve(accountIds.map(id => ({ id, status: 'active' })));
        }
        return Promise.resolve();
      });

      // Act
      const response = await request(app)
        .post('/share/certificate/batch/start')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          input: batchData,
          session_variables: {
            'x-hasura-user-id': testData.userId
          }
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('batchId');
      expect(response.body).toHaveProperty('totalAccounts', 3);
    });
  });

  describe('Error Handling', () => {
    test('should handle template not found error', async () => {
      // Arrange
      const nonExistentId = uuidv4();
      mockDb.query.mockResolvedValueOnce([]);

      // Act
      const response = await request(app)
        .post('/share/certificate/template')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          input: { templateId: nonExistentId }
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', `Certificate template with ID ${nonExistentId} not found`);
    });

    test('should handle duplicate series prefix error', async () => {
      // Arrange
      const seriesData = {
        productId: testData.productId,
        prefix: 'DUPLICATE'
      };
      
      (shareService.getProduct as jest.Mock).mockResolvedValueOnce({ 
        id: testData.productId, 
        name: 'Test Product' 
      });
      
      mockDb.query.mockResolvedValueOnce([
        { id: uuidv4(), product_id: testData.productId, prefix: 'DUPLICATE' }
      ]);

      // Act
      const response = await request(app)
        .post('/share/certificate/series/create')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          input: seriesData,
          session_variables: {
            'x-hasura-user-id': testData.userId
          }
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', `A certificate series with prefix '${seriesData.prefix}' already exists for this product`);
    });

    test('should handle revocation of non-active certificate', async () => {
      // Arrange
      const revocationData = {
        certificateId: testData.certificateId,
        revocationDate: '2023-02-01',
        reason: 'Certificate lost'
      };
      
      mockDb.query.mockResolvedValueOnce([{ 
        id: testData.certificateId, 
        certificate_number: testData.certificateNumber, 
        status: 'revoked'
      }]);

      // Act
      const response = await request(app)
        .post('/share/certificate/revoke')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          input: revocationData,
          session_variables: {
            'x-hasura-user-id': testData.userId
          }
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', `Certificate is not active and cannot be revoked. Current status: revoked`);
    });

    test('should handle regeneration of non-revoked certificate', async () => {
      // Arrange
      const regenerateData = {
        certificateId: testData.certificateId,
        newIssueDate: '2023-02-15'
      };
      
      mockDb.query.mockResolvedValueOnce([{ 
        id: testData.certificateId, 
        certificate_number: testData.certificateNumber, 
        status: 'active'
      }]);

      // Act
      const response = await request(app)
        .post('/share/certificate/regenerate')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          input: regenerateData,
          session_variables: {
            'x-hasura-user-id': testData.userId
          }
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', `Only revoked or expired certificates can be regenerated. Current status: active`);
    });

    test('should handle case with no active accounts for batch generation', async () => {
      // Arrange
      const batchData = {
        productId: testData.productId,
        templateId: testData.templateId,
        seriesId: testData.seriesId
      };
      
      mockDb.query.mockImplementation((query) => {
        if (query.includes('BEGIN') || query.includes('ROLLBACK')) {
          return Promise.resolve();
        }
        if (query.includes('WHERE a.product_id = $1')) {
          return Promise.resolve([]);
        }
        return Promise.resolve();
      });

      // Act
      const response = await request(app)
        .post('/share/certificate/batch/start')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          input: batchData,
          session_variables: {
            'x-hasura-user-id': testData.userId
          }
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'No active accounts found to process');
    });
  });
});