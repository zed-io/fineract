/**
 * Share Certificate Handlers Unit Tests
 * Tests the API handlers for share certificate operations
 */

import { Request, Response } from 'express';
import { shareCertificateHandlers } from '../../src/handlers/shareCertificate';
import { shareCertificateService } from '../../src/services/shareCertificateService';
import fs from 'fs';

// Mock dependencies
jest.mock('../../src/services/shareCertificateService');
jest.mock('fs');

describe('Share Certificate Handlers', () => {
  // Mock request and response objects
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseJson: jest.Mock;
  let responseStatus: jest.Mock;

  beforeEach(() => {
    responseJson = jest.fn().mockReturnValue({});
    responseStatus = jest.fn().mockReturnThis();

    mockRequest = {
      body: {
        input: {},
        session_variables: {
          'x-hasura-user-id': 'user123'
        }
      }
    };

    mockResponse = {
      json: responseJson,
      status: responseStatus,
      setHeader: jest.fn()
    };

    jest.clearAllMocks();
  });

  describe('Template Management Handlers', () => {
    test('getTemplates should return all templates', async () => {
      // Arrange
      const mockTemplates = {
        templates: [
          { id: 'template1', name: 'Template 1' },
          { id: 'template2', name: 'Template 2' }
        ]
      };
      (shareCertificateService.getTemplates as jest.Mock).mockResolvedValueOnce(mockTemplates);

      // Act
      await shareCertificateHandlers.getTemplates(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(shareCertificateService.getTemplates).toHaveBeenCalled();
      expect(responseJson).toHaveBeenCalledWith(mockTemplates);
    });

    test('getTemplates should handle errors', async () => {
      // Arrange
      const errorMessage = 'Failed to fetch templates';
      (shareCertificateService.getTemplates as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      // Act
      await shareCertificateHandlers.getTemplates(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({ message: errorMessage });
    });

    test('getTemplate should return a single template', async () => {
      // Arrange
      const templateId = 'template1';
      mockRequest.body!.input = { templateId };
      
      const mockTemplate = {
        template: { id: templateId, name: 'Template 1' }
      };
      (shareCertificateService.getTemplate as jest.Mock).mockResolvedValueOnce(mockTemplate);

      // Act
      await shareCertificateHandlers.getTemplate(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(shareCertificateService.getTemplate).toHaveBeenCalledWith(templateId);
      expect(responseJson).toHaveBeenCalledWith(mockTemplate);
    });

    test('createTemplate should create a new template', async () => {
      // Arrange
      const templateData = {
        name: 'New Template',
        templateContent: '<html>Template content</html>'
      };
      mockRequest.body!.input = templateData;
      
      const mockResult = {
        templateId: 'new-template-id',
        name: templateData.name
      };
      (shareCertificateService.createTemplate as jest.Mock).mockResolvedValueOnce(mockResult);

      // Act
      await shareCertificateHandlers.createTemplate(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(shareCertificateService.createTemplate).toHaveBeenCalledWith(
        templateData,
        mockRequest.body!.session_variables!['x-hasura-user-id']
      );
      expect(responseJson).toHaveBeenCalledWith(mockResult);
    });

    test('updateTemplate should update an existing template', async () => {
      // Arrange
      const templateId = 'template1';
      const templateData = {
        templateId,
        name: 'Updated Template',
        isActive: true
      };
      mockRequest.body!.input = templateData;
      
      const mockResult = {
        templateId,
        name: templateData.name,
        updated: true
      };
      (shareCertificateService.updateTemplate as jest.Mock).mockResolvedValueOnce(mockResult);

      // Act
      await shareCertificateHandlers.updateTemplate(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(shareCertificateService.updateTemplate).toHaveBeenCalledWith(
        templateId,
        { name: templateData.name, isActive: templateData.isActive },
        mockRequest.body!.session_variables!['x-hasura-user-id']
      );
      expect(responseJson).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('Series Management Handlers', () => {
    test('getSeriesList should return all series for a product', async () => {
      // Arrange
      const productId = 'product1';
      mockRequest.body!.input = { productId };
      
      const mockSeriesList = {
        seriesList: [
          { id: 'series1', product_id: productId, prefix: 'SHARE-A' },
          { id: 'series2', product_id: productId, prefix: 'SHARE-B' }
        ]
      };
      (shareCertificateService.getSeriesList as jest.Mock).mockResolvedValueOnce(mockSeriesList);

      // Act
      await shareCertificateHandlers.getSeriesList(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(shareCertificateService.getSeriesList).toHaveBeenCalledWith(productId);
      expect(responseJson).toHaveBeenCalledWith(mockSeriesList);
    });

    test('createSeries should create a new series', async () => {
      // Arrange
      const seriesData = {
        productId: 'product1',
        prefix: 'SHARE-A'
      };
      mockRequest.body!.input = seriesData;
      
      const mockResult = {
        seriesId: 'new-series-id',
        prefix: seriesData.prefix
      };
      (shareCertificateService.createSeries as jest.Mock).mockResolvedValueOnce(mockResult);

      // Act
      await shareCertificateHandlers.createSeries(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(shareCertificateService.createSeries).toHaveBeenCalledWith(
        seriesData,
        mockRequest.body!.session_variables!['x-hasura-user-id']
      );
      expect(responseJson).toHaveBeenCalledWith(mockResult);
    });

    test('updateSeries should update an existing series', async () => {
      // Arrange
      const seriesId = 'series1';
      const seriesData = {
        seriesId,
        prefix: 'SHARE-NEW',
        nextNumber: 5
      };
      mockRequest.body!.input = seriesData;
      
      const mockResult = {
        seriesId,
        prefix: seriesData.prefix,
        updated: true
      };
      (shareCertificateService.updateSeries as jest.Mock).mockResolvedValueOnce(mockResult);

      // Act
      await shareCertificateHandlers.updateSeries(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(shareCertificateService.updateSeries).toHaveBeenCalledWith(
        seriesId,
        { prefix: seriesData.prefix, nextNumber: seriesData.nextNumber },
        mockRequest.body!.session_variables!['x-hasura-user-id']
      );
      expect(responseJson).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('Certificate Management Handlers', () => {
    test('getCertificate should return certificate details', async () => {
      // Arrange
      const certificateId = 'cert1';
      mockRequest.body!.input = { certificateId };
      
      const mockCertificate = {
        certificate: {
          id: certificateId,
          certificate_number: 'SHR000001',
          status: 'active'
        }
      };
      (shareCertificateService.getCertificate as jest.Mock).mockResolvedValueOnce(mockCertificate);

      // Act
      await shareCertificateHandlers.getCertificate(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(shareCertificateService.getCertificate).toHaveBeenCalledWith(certificateId);
      expect(responseJson).toHaveBeenCalledWith(mockCertificate);
    });

    test('getCertificates should return all certificates for an account', async () => {
      // Arrange
      const accountId = 'account1';
      mockRequest.body!.input = { accountId };
      
      const mockCertificates = {
        certificates: [
          { id: 'cert1', certificate_number: 'SHR000001', account_id: accountId },
          { id: 'cert2', certificate_number: 'SHR000002', account_id: accountId }
        ]
      };
      (shareCertificateService.getCertificates as jest.Mock).mockResolvedValueOnce(mockCertificates);

      // Act
      await shareCertificateHandlers.getCertificates(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(shareCertificateService.getCertificates).toHaveBeenCalledWith(accountId);
      expect(responseJson).toHaveBeenCalledWith(mockCertificates);
    });

    test('generateCertificate should create a new certificate', async () => {
      // Arrange
      const certData = {
        accountId: 'account1',
        issueDate: '2023-01-01',
        sharesQuantity: 100
      };
      mockRequest.body!.input = certData;
      
      const mockResult = {
        certificateId: 'new-cert-id',
        certificateNumber: 'SHR000001',
        accountId: certData.accountId,
        issueDate: certData.issueDate,
        sharesQuantity: certData.sharesQuantity,
        downloadUrl: '/api/share/certificate/download?id=new-cert-id&format=pdf'
      };
      (shareCertificateService.generateCertificate as jest.Mock).mockResolvedValueOnce(mockResult);

      // Act
      await shareCertificateHandlers.generateCertificate(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(shareCertificateService.generateCertificate).toHaveBeenCalledWith(
        certData,
        mockRequest.body!.session_variables!['x-hasura-user-id']
      );
      expect(responseJson).toHaveBeenCalledWith(mockResult);
    });

    test('revokeCertificate should revoke a certificate', async () => {
      // Arrange
      const certificateId = 'cert1';
      const revocationData = {
        certificateId,
        revocationDate: '2023-02-01',
        reason: 'Lost certificate'
      };
      mockRequest.body!.input = revocationData;
      
      const mockResult = {
        certificateId,
        certificateNumber: 'SHR000001',
        revocationDate: revocationData.revocationDate,
        status: 'revoked'
      };
      (shareCertificateService.revokeCertificate as jest.Mock).mockResolvedValueOnce(mockResult);

      // Act
      await shareCertificateHandlers.revokeCertificate(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(shareCertificateService.revokeCertificate).toHaveBeenCalledWith(
        certificateId,
        { revocationDate: revocationData.revocationDate, reason: revocationData.reason },
        mockRequest.body!.session_variables!['x-hasura-user-id']
      );
      expect(responseJson).toHaveBeenCalledWith(mockResult);
    });

    test('regenerateCertificate should create a replacement certificate', async () => {
      // Arrange
      const certificateId = 'cert1';
      const regenerateData = {
        certificateId,
        newIssueDate: '2023-02-01',
        notes: 'Replacement for lost certificate'
      };
      mockRequest.body!.input = regenerateData;
      
      const mockResult = {
        originalCertificateId: certificateId,
        newCertificateId: 'cert2',
        newCertificateNumber: 'SHR000002',
        issueDate: regenerateData.newIssueDate,
        status: 'active',
        downloadUrl: '/api/share/certificate/download?id=cert2&format=pdf'
      };
      (shareCertificateService.regenerateCertificate as jest.Mock).mockResolvedValueOnce(mockResult);

      // Act
      await shareCertificateHandlers.regenerateCertificate(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(shareCertificateService.regenerateCertificate).toHaveBeenCalledWith(
        certificateId,
        { newIssueDate: regenerateData.newIssueDate, notes: regenerateData.notes },
        mockRequest.body!.session_variables!['x-hasura-user-id']
      );
      expect(responseJson).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('Certificate Download Handler', () => {
    test('downloadCertificate should return download information for GraphQL requests', async () => {
      // Arrange
      const certificateId = 'cert1';
      const format = 'pdf';
      mockRequest.body!.input = { certificateId, format };
      
      const mockResult = {
        certificateId,
        certificateNumber: 'SHR000001',
        downloadUrl: `/api/share/certificate/download?id=${certificateId}&format=${format}`,
        format,
        expiryTime: expect.any(String)
      };
      (shareCertificateService.downloadCertificate as jest.Mock).mockResolvedValueOnce(mockResult);

      // Act
      await shareCertificateHandlers.downloadCertificate(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(shareCertificateService.downloadCertificate).toHaveBeenCalledWith(certificateId, format);
      expect(responseJson).toHaveBeenCalledWith(mockResult);
    });

    test('downloadCertificate should stream file for direct download requests', async () => {
      // Arrange
      const certificateId = 'cert1';
      const format = 'pdf';
      
      // Mock direct GET request
      mockRequest = {
        body: {},
        query: {
          id: certificateId,
          format
        }
      };
      
      const mockCertificate = {
        certificate: {
          id: certificateId,
          certificate_number: 'SHR000001',
          document_path: '/path/to/certificate.pdf'
        }
      };
      (shareCertificateService.getCertificate as jest.Mock).mockResolvedValueOnce(mockCertificate);
      
      // Mock file system
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      
      const mockFileStream = {
        pipe: jest.fn()
      };
      (fs.createReadStream as jest.Mock).mockReturnValue(mockFileStream);

      // Act
      await shareCertificateHandlers.downloadCertificate(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(shareCertificateService.getCertificate).toHaveBeenCalledWith(certificateId);
      expect(fs.existsSync).toHaveBeenCalledWith(mockCertificate.certificate.document_path);
      expect(fs.createReadStream).toHaveBeenCalledWith(mockCertificate.certificate.document_path);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        `attachment; filename="${mockCertificate.certificate.certificate_number}.pdf"`
      );
      expect(mockFileStream.pipe).toHaveBeenCalledWith(mockResponse);
    });

    test('downloadCertificate should handle file not found errors', async () => {
      // Arrange
      const certificateId = 'cert1';
      
      // Mock direct GET request
      mockRequest = {
        body: {},
        query: {
          id: certificateId
        }
      };
      
      const mockCertificate = {
        certificate: {
          id: certificateId,
          certificate_number: 'SHR000001',
          document_path: '/path/to/certificate.pdf'
        }
      };
      (shareCertificateService.getCertificate as jest.Mock).mockResolvedValueOnce(mockCertificate);
      
      // Mock file not found
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      // Act
      await shareCertificateHandlers.downloadCertificate(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(responseStatus).toHaveBeenCalledWith(404);
      expect(responseJson).toHaveBeenCalledWith({ message: 'Certificate file not found' });
    });
  });

  describe('Certificate Verification Handler', () => {
    test('verifyCertificate should verify a valid certificate', async () => {
      // Arrange
      const certificateNumber = 'SHR000001';
      const verificationCode = 'ABC123';
      mockRequest.body!.input = { certificateNumber, verificationCode };
      
      const mockResult = {
        isValid: true,
        certificate: {
          id: 'cert1',
          certificate_number: certificateNumber,
          status: 'active'
        },
        message: 'Certificate is valid'
      };
      (shareCertificateService.verifyCertificate as jest.Mock).mockResolvedValueOnce(mockResult);

      // Act
      await shareCertificateHandlers.verifyCertificate(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(shareCertificateService.verifyCertificate).toHaveBeenCalledWith(certificateNumber, verificationCode);
      expect(responseJson).toHaveBeenCalledWith(mockResult);
    });

    test('verifyCertificate should handle invalid verification codes', async () => {
      // Arrange
      const certificateNumber = 'SHR000001';
      const verificationCode = 'WRONG';
      mockRequest.body!.input = { certificateNumber, verificationCode };
      
      const mockResult = {
        isValid: false,
        message: 'Certificate not found or verification code is incorrect'
      };
      (shareCertificateService.verifyCertificate as jest.Mock).mockResolvedValueOnce(mockResult);

      // Act
      await shareCertificateHandlers.verifyCertificate(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(responseJson).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('Batch Certificate Handlers', () => {
    test('getBatches should return all certificate batches', async () => {
      // Arrange
      const mockBatches = {
        batches: [
          { id: 'batch1', status: 'completed' },
          { id: 'batch2', status: 'pending' }
        ]
      };
      (shareCertificateService.getBatches as jest.Mock).mockResolvedValueOnce(mockBatches);

      // Act
      await shareCertificateHandlers.getBatches(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(shareCertificateService.getBatches).toHaveBeenCalled();
      expect(responseJson).toHaveBeenCalledWith(mockBatches);
    });

    test('getBatches should filter by product ID and status if provided', async () => {
      // Arrange
      const productId = 'product1';
      const status = 'pending';
      mockRequest.body!.input = { productId, status };
      
      const mockBatches = {
        batches: [
          { id: 'batch2', product_id: productId, status }
        ]
      };
      (shareCertificateService.getBatches as jest.Mock).mockResolvedValueOnce(mockBatches);

      // Act
      await shareCertificateHandlers.getBatches(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(shareCertificateService.getBatches).toHaveBeenCalledWith(productId, status);
      expect(responseJson).toHaveBeenCalledWith(mockBatches);
    });

    test('getBatch should return details for a specific batch', async () => {
      // Arrange
      const batchId = 'batch1';
      mockRequest.body!.input = { batchId };
      
      const mockBatch = {
        batch: {
          id: batchId,
          status: 'completed',
          items: [
            { id: 'item1', batch_id: batchId, status: 'completed' },
            { id: 'item2', batch_id: batchId, status: 'completed' }
          ]
        }
      };
      (shareCertificateService.getBatch as jest.Mock).mockResolvedValueOnce(mockBatch);

      // Act
      await shareCertificateHandlers.getBatch(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(shareCertificateService.getBatch).toHaveBeenCalledWith(batchId);
      expect(responseJson).toHaveBeenCalledWith(mockBatch);
    });

    test('startBatch should initiate a new certificate batch process', async () => {
      // Arrange
      const batchData = {
        productId: 'product1',
        templateId: 'template1',
        seriesId: 'series1'
      };
      mockRequest.body!.input = batchData;
      
      const mockResult = {
        batchId: 'new-batch-id',
        status: 'pending',
        totalAccounts: 5,
        message: 'Batch certificate generation started for 5 accounts'
      };
      (shareCertificateService.startBatch as jest.Mock).mockResolvedValueOnce(mockResult);

      // Act
      await shareCertificateHandlers.startBatch(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(shareCertificateService.startBatch).toHaveBeenCalledWith(
        batchData,
        mockRequest.body!.session_variables!['x-hasura-user-id']
      );
      expect(responseJson).toHaveBeenCalledWith(mockResult);
    });
  });
});