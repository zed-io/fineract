/**
 * Share Certificate Service Unit Tests
 * Tests for the share certificate service functions
 */

import { shareCertificateService } from '../../src/services/shareCertificateService';
import { shareService } from '../../src/services/shareService';
import { initDatabase } from '../../src/utils/db';
import puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';

// Mock dependencies
jest.mock('../../src/utils/db');
jest.mock('../../src/services/shareService');
jest.mock('puppeteer');
jest.mock('handlebars');
jest.mock('fs');
jest.mock('path');

describe('Share Certificate Service', () => {
  // Mock implementation for the database connection
  const mockDb = {
    query: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (initDatabase as jest.Mock).mockResolvedValue(mockDb);
    (path.join as jest.Mock).mockReturnValue('/mock/path/to/certificates');
  });

  describe('Template Management', () => {
    test('getTemplates should return a list of templates', async () => {
      // Arrange
      const mockTemplates = [
        { id: 'template1', name: 'Template 1' },
        { id: 'template2', name: 'Template 2' },
      ];
      mockDb.query.mockResolvedValueOnce(mockTemplates);

      // Act
      const result = await shareCertificateService.getTemplates();

      // Assert
      expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM share_certificate_template'), []);
      expect(result).toEqual({ templates: mockTemplates });
    });

    test('getTemplate should return a single template by ID', async () => {
      // Arrange
      const templateId = 'template1';
      const mockTemplate = { id: templateId, name: 'Template 1' };
      mockDb.query.mockResolvedValueOnce([mockTemplate]);

      // Act
      const result = await shareCertificateService.getTemplate(templateId);

      // Assert
      expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('WHERE id = $1'), [templateId]);
      expect(result).toEqual({ template: mockTemplate });
    });

    test('getTemplate should throw error when template not found', async () => {
      // Arrange
      const templateId = 'nonexistent-template';
      mockDb.query.mockResolvedValueOnce([]);

      // Act & Assert
      await expect(shareCertificateService.getTemplate(templateId))
        .rejects.toThrow(`Certificate template with ID ${templateId} not found`);
    });

    test('createTemplate should create a new template', async () => {
      // Arrange
      const templateData = {
        name: 'New Template',
        description: 'Test description',
        templateContent: '<html>Template content</html>',
        isActive: true,
        isDefault: false,
      };
      const userId = 'user123';

      // Act
      const result = await shareCertificateService.createTemplate(templateData, userId);

      // Assert
      expect(mockDb.query).toHaveBeenCalledTimes(1);
      expect(result).toHaveProperty('templateId');
      expect(result.name).toEqual(templateData.name);
    });

    test('createTemplate should update other templates if setting this one as default', async () => {
      // Arrange
      const templateData = {
        name: 'New Default Template',
        templateContent: '<html>Template content</html>',
        isDefault: true,
      };
      const userId = 'user123';

      // Act
      await shareCertificateService.createTemplate(templateData, userId);

      // Assert
      expect(mockDb.query).toHaveBeenCalledTimes(2);
      expect(mockDb.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('UPDATE share_certificate_template'),
        []
      );
    });

    test('updateTemplate should update an existing template', async () => {
      // Arrange
      const templateId = 'template1';
      const templateData = {
        name: 'Updated Template',
        isActive: true,
      };
      const userId = 'user123';
      mockDb.query.mockResolvedValueOnce([{ id: templateId, name: 'Old Name' }]);

      // Act
      const result = await shareCertificateService.updateTemplate(templateId, templateData, userId);

      // Assert
      expect(mockDb.query).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        templateId,
        name: templateData.name,
        updated: true,
      });
    });

    test('updateTemplate should throw error when template not found', async () => {
      // Arrange
      const templateId = 'nonexistent-template';
      const templateData = { name: 'Updated Template' };
      const userId = 'user123';
      mockDb.query.mockResolvedValueOnce([]);

      // Act & Assert
      await expect(shareCertificateService.updateTemplate(templateId, templateData, userId))
        .rejects.toThrow(`Certificate template with ID ${templateId} not found`);
    });
  });

  describe('Series Management', () => {
    test('getSeriesList should return series for a product', async () => {
      // Arrange
      const productId = 'product1';
      const mockSeries = [
        { id: 'series1', product_id: productId, prefix: 'SHARE-A' },
        { id: 'series2', product_id: productId, prefix: 'SHARE-B' },
      ];
      (shareService.getProduct as jest.Mock).mockResolvedValueOnce({ id: productId, name: 'Test Product' });
      mockDb.query.mockResolvedValueOnce(mockSeries);

      // Act
      const result = await shareCertificateService.getSeriesList(productId);

      // Assert
      expect(shareService.getProduct).toHaveBeenCalledWith(productId);
      expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('WHERE s.product_id = $1'), [productId]);
      expect(result).toEqual({ seriesList: mockSeries });
    });

    test('createSeries should create a new certificate series', async () => {
      // Arrange
      const productId = 'product1';
      const seriesData = {
        productId,
        prefix: 'SHARE-A',
        nextNumber: 1,
        isActive: true,
      };
      const userId = 'user123';
      (shareService.getProduct as jest.Mock).mockResolvedValueOnce({ id: productId, name: 'Test Product' });
      mockDb.query.mockResolvedValueOnce([]);

      // Act
      const result = await shareCertificateService.createSeries(seriesData, userId);

      // Assert
      expect(shareService.getProduct).toHaveBeenCalledWith(productId);
      expect(mockDb.query).toHaveBeenCalledTimes(2);
      expect(result).toHaveProperty('seriesId');
      expect(result.prefix).toEqual(seriesData.prefix);
    });

    test('createSeries should throw error when series with same prefix exists', async () => {
      // Arrange
      const productId = 'product1';
      const seriesData = {
        productId,
        prefix: 'SHARE-A',
      };
      const userId = 'user123';
      (shareService.getProduct as jest.Mock).mockResolvedValueOnce({ id: productId, name: 'Test Product' });
      mockDb.query.mockResolvedValueOnce([{ id: 'existingSeries', prefix: 'SHARE-A' }]);

      // Act & Assert
      await expect(shareCertificateService.createSeries(seriesData, userId))
        .rejects.toThrow(`A certificate series with prefix '${seriesData.prefix}' already exists for this product`);
    });

    test('updateSeries should update an existing series', async () => {
      // Arrange
      const seriesId = 'series1';
      const seriesData = {
        prefix: 'SHARE-NEW',
        nextNumber: 5,
      };
      const userId = 'user123';
      mockDb.query.mockResolvedValueOnce([{ id: seriesId, product_id: 'product1', prefix: 'SHARE-OLD' }]);
      mockDb.query.mockResolvedValueOnce([]);

      // Act
      const result = await shareCertificateService.updateSeries(seriesId, seriesData, userId);

      // Assert
      expect(mockDb.query).toHaveBeenCalledTimes(3);
      expect(result).toEqual({
        seriesId,
        prefix: seriesData.prefix,
        updated: true,
      });
    });

    test('updateSeries should throw error when series not found', async () => {
      // Arrange
      const seriesId = 'nonexistent-series';
      const seriesData = { prefix: 'SHARE-NEW' };
      const userId = 'user123';
      mockDb.query.mockResolvedValueOnce([]);

      // Act & Assert
      await expect(shareCertificateService.updateSeries(seriesId, seriesData, userId))
        .rejects.toThrow(`Certificate series with ID ${seriesId} not found`);
    });
  });

  describe('Certificate Generation', () => {
    test('generateCertificate should create a new certificate', async () => {
      // Arrange
      const certData = {
        accountId: 'account1',
        templateId: 'template1',
        issueDate: '2023-01-01',
        sharesQuantity: 100,
      };
      const userId = 'user123';

      // Mock database responses
      mockDb.query.mockImplementation((query, params) => {
        if (query.includes('BEGIN')) return Promise.resolve();
        if (query.includes('COMMIT')) return Promise.resolve();
        if (query.includes('ROLLBACK')) return Promise.resolve();
        return Promise.resolve([]);
      });

      const mockAccount = { 
        id: 'account1', 
        productId: 'product1',
        productName: 'Share Product',
        clientName: 'Test Client',
        accountNo: 'ACC001' 
      };
      (shareService.getAccount as jest.Mock).mockResolvedValueOnce(mockAccount);

      // Mock series
      mockDb.query.mockResolvedValueOnce([{ 
        id: 'series1', 
        prefix: 'SHR', 
        next_number: 1
      }]);

      // Mock template
      mockDb.query.mockResolvedValueOnce([{ id: 'template1' }]);
      (shareCertificateService.getTemplate as jest.Mock) = jest.fn().mockResolvedValueOnce({ 
        template: { 
          id: 'template1',
          templateContent: '<html>{{clientName}}</html>' 
        } 
      });

      // Mock product
      (shareService.getProduct as jest.Mock).mockResolvedValueOnce({ 
        id: 'product1', 
        name: 'Share Product',
        nominalPrice: 10.5,
        currency: { displaySymbol: '$' }
      });

      // Mock PDF generation
      (shareCertificateService.generateCertificatePdf as jest.Mock) = jest.fn().mockResolvedValueOnce('/path/to/certificate.pdf');

      // Act
      const result = await shareCertificateService.generateCertificate(certData, userId);

      // Assert
      expect(mockDb.query).toHaveBeenCalledWith('BEGIN');
      expect(mockDb.query).toHaveBeenCalledWith('COMMIT');
      expect(result).toHaveProperty('certificateId');
      expect(result).toHaveProperty('certificateNumber');
      expect(result).toHaveProperty('downloadUrl');
      expect(result.accountId).toEqual(certData.accountId);
      expect(result.sharesQuantity).toEqual(certData.sharesQuantity);
    });

    test('generateCertificatePdf should generate a PDF document', async () => {
      // Arrange
      const certificateId = 'cert1';
      const certificateNumber = 'SHR000001';
      const account = {
        clientName: 'John Doe',
        accountNo: 'ACC001',
      };
      const product = {
        name: 'Share Product',
        nominalPrice: 10.0,
        currency: { displaySymbol: '$' },
        shareCapitalType: 'EQUITY',
      };
      const certData = {
        issueDate: '2023-01-01',
        sharesQuantity: 100,
      };
      const template = {
        templateContent: '<html>{{clientName}}</html>',
      };
      const verificationCode = 'ABC123';

      // Mock filesystem
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);

      // Mock Handlebars
      const mockCompiledTemplate = jest.fn().mockReturnValue('<html>John Doe</html>');
      (handlebars.compile as jest.Mock).mockReturnValue(mockCompiledTemplate);

      // Mock Puppeteer
      const mockPage = {
        setContent: jest.fn().mockResolvedValue(undefined),
        pdf: jest.fn().mockResolvedValue('/path/to/certificate.pdf'),
      };
      const mockBrowser = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn().mockResolvedValue(undefined),
      };
      (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);

      // Act
      const result = await shareCertificateService.generateCertificatePdf(
        certificateId,
        certificateNumber,
        account,
        product,
        certData,
        template,
        verificationCode
      );

      // Assert
      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(handlebars.compile).toHaveBeenCalledWith(template.templateContent);
      expect(mockCompiledTemplate).toHaveBeenCalled();
      expect(puppeteer.launch).toHaveBeenCalled();
      expect(mockPage.setContent).toHaveBeenCalled();
      expect(mockPage.pdf).toHaveBeenCalled();
      expect(mockBrowser.close).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('Certificate Lifecycle Management', () => {
    test('getCertificate should return certificate details', async () => {
      // Arrange
      const certificateId = 'cert1';
      const mockCertificate = { 
        id: certificateId, 
        certificate_number: 'SHR000001', 
        status: 'active'
      };
      mockDb.query.mockResolvedValueOnce([mockCertificate]);

      // Act
      const result = await shareCertificateService.getCertificate(certificateId);

      // Assert
      expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('WHERE c.id = $1'), [certificateId]);
      expect(result).toEqual({ certificate: mockCertificate });
    });

    test('getCertificate should throw error when certificate not found', async () => {
      // Arrange
      const certificateId = 'nonexistent-cert';
      mockDb.query.mockResolvedValueOnce([]);

      // Act & Assert
      await expect(shareCertificateService.getCertificate(certificateId))
        .rejects.toThrow(`Certificate with ID ${certificateId} not found`);
    });

    test('getCertificates should return all certificates for an account', async () => {
      // Arrange
      const accountId = 'account1';
      const mockCertificates = [
        { id: 'cert1', certificate_number: 'SHR000001', account_id: accountId, status: 'active' },
        { id: 'cert2', certificate_number: 'SHR000002', account_id: accountId, status: 'revoked' },
      ];
      (shareService.getAccount as jest.Mock).mockResolvedValueOnce({ id: accountId });
      mockDb.query.mockResolvedValueOnce(mockCertificates);

      // Act
      const result = await shareCertificateService.getCertificates(accountId);

      // Assert
      expect(shareService.getAccount).toHaveBeenCalledWith(accountId);
      expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('WHERE c.account_id = $1'), [accountId]);
      expect(result).toEqual({ certificates: mockCertificates });
    });

    test('revokeCertificate should change certificate status to revoked', async () => {
      // Arrange
      const certificateId = 'cert1';
      const revocationData = {
        revocationDate: '2023-02-01',
        reason: 'Lost certificate',
      };
      const userId = 'user123';

      // Mock certificate retrieval
      (shareCertificateService.getCertificate as jest.Mock) = jest.fn().mockResolvedValueOnce({ 
        certificate: { 
          id: certificateId, 
          certificate_number: 'SHR000001', 
          status: 'active' 
        } 
      });

      // Act
      const result = await shareCertificateService.revokeCertificate(certificateId, revocationData, userId);

      // Assert
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE share_certificate'),
        expect.arrayContaining([
          revocationData.revocationDate,
          userId,
          revocationData.reason,
          certificateId
        ])
      );
      expect(result).toEqual({
        certificateId,
        certificateNumber: 'SHR000001',
        revocationDate: revocationData.revocationDate,
        status: 'revoked'
      });
    });

    test('revokeCertificate should throw error when certificate is not active', async () => {
      // Arrange
      const certificateId = 'cert1';
      const revocationData = {
        revocationDate: '2023-02-01',
        reason: 'Lost certificate',
      };
      const userId = 'user123';

      // Mock certificate retrieval
      (shareCertificateService.getCertificate as jest.Mock) = jest.fn().mockResolvedValueOnce({ 
        certificate: { 
          id: certificateId, 
          certificate_number: 'SHR000001', 
          status: 'revoked' 
        } 
      });

      // Act & Assert
      await expect(shareCertificateService.revokeCertificate(certificateId, revocationData, userId))
        .rejects.toThrow(`Certificate is not active and cannot be revoked. Current status: revoked`);
    });

    test('regenerateCertificate should create a new certificate to replace a revoked one', async () => {
      // Arrange
      const certificateId = 'cert1';
      const regenerateData = {
        newIssueDate: '2023-02-01',
        notes: 'Replacement for lost certificate',
      };
      const userId = 'user123';

      // Mock original certificate retrieval
      (shareCertificateService.getCertificate as jest.Mock) = jest.fn().mockResolvedValueOnce({ 
        certificate: { 
          id: certificateId, 
          certificate_number: 'SHR000001', 
          status: 'revoked',
          account_id: 'account1',
          shares_quantity: 100
        } 
      });

      // Mock generateCertificate
      const newCertificate = {
        certificateId: 'cert2',
        certificateNumber: 'SHR000002',
        issueDate: regenerateData.newIssueDate,
        downloadUrl: '/api/share/certificate/download?id=cert2&format=pdf'
      };
      (shareCertificateService.generateCertificate as jest.Mock) = jest.fn().mockResolvedValueOnce(newCertificate);

      // Act
      const result = await shareCertificateService.regenerateCertificate(certificateId, regenerateData, userId);

      // Assert
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE share_certificate'),
        expect.arrayContaining([certificateId])
      );
      expect(result).toEqual({
        originalCertificateId: certificateId,
        newCertificateId: newCertificate.certificateId,
        newCertificateNumber: newCertificate.certificateNumber,
        issueDate: newCertificate.issueDate,
        status: 'active',
        downloadUrl: newCertificate.downloadUrl
      });
    });

    test('regenerateCertificate should throw error when certificate is not revoked or expired', async () => {
      // Arrange
      const certificateId = 'cert1';
      const regenerateData = {
        newIssueDate: '2023-02-01',
      };
      const userId = 'user123';

      // Mock certificate retrieval
      (shareCertificateService.getCertificate as jest.Mock) = jest.fn().mockResolvedValueOnce({ 
        certificate: { 
          id: certificateId, 
          status: 'active' 
        } 
      });

      // Act & Assert
      await expect(shareCertificateService.regenerateCertificate(certificateId, regenerateData, userId))
        .rejects.toThrow(`Only revoked or expired certificates can be regenerated. Current status: active`);
    });
  });

  describe('Certificate Verification', () => {
    test('verifyCertificate should validate a certificate with the correct verification code', async () => {
      // Arrange
      const certificateNumber = 'SHR000001';
      const verificationCode = 'ABC123';
      const mockCertificate = { 
        id: 'cert1', 
        certificate_number: certificateNumber, 
        status: 'active',
        expiry_date: null
      };
      mockDb.query.mockResolvedValueOnce([mockCertificate]);

      // Act
      const result = await shareCertificateService.verifyCertificate(certificateNumber, verificationCode);

      // Assert
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE c.certificate_number = $1 AND c.verification_code = $2'),
        [certificateNumber, verificationCode]
      );
      expect(result).toEqual({
        isValid: true,
        certificate: mockCertificate,
        message: 'Certificate is valid'
      });
    });

    test('verifyCertificate should return invalid status for nonexistent certificate', async () => {
      // Arrange
      const certificateNumber = 'SHR000001';
      const verificationCode = 'WRONG';
      mockDb.query.mockResolvedValueOnce([]);

      // Act
      const result = await shareCertificateService.verifyCertificate(certificateNumber, verificationCode);

      // Assert
      expect(result).toEqual({
        isValid: false,
        message: 'Certificate not found or verification code is incorrect'
      });
    });

    test('verifyCertificate should return invalid status for revoked certificate', async () => {
      // Arrange
      const certificateNumber = 'SHR000001';
      const verificationCode = 'ABC123';
      const mockCertificate = { 
        id: 'cert1', 
        certificate_number: certificateNumber, 
        status: 'revoked' 
      };
      mockDb.query.mockResolvedValueOnce([mockCertificate]);

      // Act
      const result = await shareCertificateService.verifyCertificate(certificateNumber, verificationCode);

      // Assert
      expect(result).toEqual({
        isValid: false,
        certificate: mockCertificate,
        message: 'Certificate is not active. Current status: revoked'
      });
    });

    test('verifyCertificate should return invalid status for expired certificate', async () => {
      // Arrange
      const certificateNumber = 'SHR000001';
      const verificationCode = 'ABC123';
      const mockCertificate = { 
        id: 'cert1', 
        certificate_number: certificateNumber, 
        status: 'active',
        expiry_date: '2022-01-01' // Past date
      };
      mockDb.query.mockResolvedValueOnce([mockCertificate]);
      
      // Mock the current date
      const realDateNow = Date.now;
      Date.now = jest.fn(() => new Date('2023-01-01').getTime());

      // Act
      const result = await shareCertificateService.verifyCertificate(certificateNumber, verificationCode);

      // Restore Date.now
      Date.now = realDateNow;

      // Assert
      expect(result).toEqual({
        isValid: false,
        certificate: mockCertificate,
        message: 'Certificate has expired'
      });
    });
  });

  describe('Batch Certificate Operations', () => {
    test('getBatches should return all certificate batches', async () => {
      // Arrange
      const mockBatches = [
        { id: 'batch1', status: 'completed', total_certificates: 10 },
        { id: 'batch2', status: 'pending', total_certificates: 5 },
      ];
      mockDb.query.mockResolvedValueOnce(mockBatches);

      // Act
      const result = await shareCertificateService.getBatches();

      // Assert
      expect(mockDb.query).toHaveBeenCalled();
      expect(result).toEqual({ batches: mockBatches });
    });

    test('getBatches should filter by product ID and status', async () => {
      // Arrange
      const productId = 'product1';
      const status = 'pending';
      const mockBatches = [
        { id: 'batch2', product_id: productId, status: status, total_certificates: 5 },
      ];
      mockDb.query.mockResolvedValueOnce(mockBatches);

      // Act
      const result = await shareCertificateService.getBatches(productId, status);

      // Assert
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        expect.arrayContaining([productId, status])
      );
      expect(result).toEqual({ batches: mockBatches });
    });

    test('getBatch should return batch details with items', async () => {
      // Arrange
      const batchId = 'batch1';
      const mockBatch = { 
        id: batchId, 
        status: 'completed', 
        total_certificates: 3 
      };
      const mockItems = [
        { id: 'item1', batch_id: batchId, account_id: 'account1', certificate_id: 'cert1', status: 'completed' },
        { id: 'item2', batch_id: batchId, account_id: 'account2', certificate_id: 'cert2', status: 'completed' },
        { id: 'item3', batch_id: batchId, account_id: 'account3', certificate_id: 'cert3', status: 'completed' },
      ];
      mockDb.query.mockResolvedValueOnce([mockBatch]).mockResolvedValueOnce(mockItems);

      // Act
      const result = await shareCertificateService.getBatch(batchId);

      // Assert
      expect(mockDb.query).toHaveBeenCalledTimes(2);
      expect(mockDb.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('WHERE b.id = $1'),
        [batchId]
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('WHERE i.batch_id = $1'),
        [batchId]
      );
      expect(result.batch).toEqual({
        ...mockBatch,
        items: mockItems
      });
    });

    test('getBatch should throw error when batch not found', async () => {
      // Arrange
      const batchId = 'nonexistent-batch';
      mockDb.query.mockResolvedValueOnce([]);

      // Act & Assert
      await expect(shareCertificateService.getBatch(batchId))
        .rejects.toThrow(`Certificate batch with ID ${batchId} not found`);
    });

    test('startBatch should create a new certificate batch', async () => {
      // Arrange
      const batchData = {
        productId: 'product1',
        templateId: 'template1',
        seriesId: 'series1',
      };
      const userId = 'user123';
      
      // Mock transaction and account queries
      mockDb.query.mockImplementation((query, params) => {
        if (query.includes('BEGIN')) return Promise.resolve();
        if (query.includes('COMMIT')) return Promise.resolve();
        if (query.includes('ROLLBACK')) return Promise.resolve();
        
        // Mock finding active accounts
        if (query.includes('WHERE a.product_id = $1')) {
          return Promise.resolve([
            { id: 'account1', status: 'active' },
            { id: 'account2', status: 'active' },
          ]);
        }
        
        return Promise.resolve([]);
      });

      // Act
      const result = await shareCertificateService.startBatch(batchData, userId);

      // Assert
      expect(mockDb.query).toHaveBeenCalledWith('BEGIN');
      expect(mockDb.query).toHaveBeenCalledWith('COMMIT');
      expect(result).toHaveProperty('batchId');
      expect(result.status).toEqual('pending');
      expect(result.totalAccounts).toEqual(2);
    });

    test('startBatch should use specific accounts when accountIds are provided', async () => {
      // Arrange
      const batchData = {
        accountIds: ['account1', 'account2'],
        templateId: 'template1',
        seriesId: 'series1',
      };
      const userId = 'user123';
      
      // Mock transaction and account queries
      mockDb.query.mockImplementation((query, params) => {
        if (query.includes('BEGIN')) return Promise.resolve();
        if (query.includes('COMMIT')) return Promise.resolve();
        if (query.includes('ROLLBACK')) return Promise.resolve();
        
        // Mock finding specific accounts
        if (query.includes('WHERE a.id IN')) {
          return Promise.resolve([
            { id: 'account1', status: 'active' },
            { id: 'account2', status: 'active' },
          ]);
        }
        
        return Promise.resolve([]);
      });

      // Act
      const result = await shareCertificateService.startBatch(batchData, userId);

      // Assert
      expect(result).toHaveProperty('batchId');
      expect(result.totalAccounts).toEqual(2);
    });

    test('startBatch should throw error when no accounts are found', async () => {
      // Arrange
      const batchData = {
        productId: 'product1',
        templateId: 'template1',
        seriesId: 'series1',
      };
      const userId = 'user123';
      
      // Mock transaction and empty account results
      mockDb.query.mockImplementation((query, params) => {
        if (query.includes('BEGIN')) return Promise.resolve();
        if (query.includes('ROLLBACK')) return Promise.resolve();
        
        // Mock finding no active accounts
        if (query.includes('WHERE a.product_id = $1')) {
          return Promise.resolve([]);
        }
        
        return Promise.resolve([]);
      });

      // Act & Assert
      await expect(shareCertificateService.startBatch(batchData, userId))
        .rejects.toThrow('No active accounts found to process');
      expect(mockDb.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('Certificate Download', () => {
    test('downloadCertificate should return a download URL', async () => {
      // Arrange
      const certificateId = 'cert1';
      const format = 'pdf';
      const mockCertificate = { 
        certificate: {
          id: certificateId,
          certificate_number: 'SHR000001',
          document_path: '/path/to/certificate.pdf'
        }
      };
      (shareCertificateService.getCertificate as jest.Mock) = jest.fn().mockResolvedValueOnce(mockCertificate);

      // Act
      const result = await shareCertificateService.downloadCertificate(certificateId, format);

      // Assert
      expect(result).toHaveProperty('downloadUrl');
      expect(result.certificateId).toEqual(certificateId);
      expect(result.certificateNumber).toEqual('SHR000001');
      expect(result.format).toEqual('pdf');
    });

    test('downloadCertificate should throw error when document not found', async () => {
      // Arrange
      const certificateId = 'cert1';
      const format = 'pdf';
      const mockCertificate = { 
        certificate: {
          id: certificateId,
          certificate_number: 'SHR000001',
          document_path: null
        }
      };
      (shareCertificateService.getCertificate as jest.Mock) = jest.fn().mockResolvedValueOnce(mockCertificate);

      // Act & Assert
      await expect(shareCertificateService.downloadCertificate(certificateId, format))
        .rejects.toThrow('Certificate document not found');
    });

    test('downloadCertificate should throw error for unsupported formats', async () => {
      // Arrange
      const certificateId = 'cert1';
      const format = 'docx'; // Unsupported format
      const mockCertificate = { 
        certificate: {
          id: certificateId,
          certificate_number: 'SHR000001',
          document_path: '/path/to/certificate.pdf'
        }
      };
      (shareCertificateService.getCertificate as jest.Mock) = jest.fn().mockResolvedValueOnce(mockCertificate);

      // Act & Assert
      await expect(shareCertificateService.downloadCertificate(certificateId, format))
        .rejects.toThrow(`Unsupported format: ${format}. Only PDF is currently supported.`);
    });
  });
});