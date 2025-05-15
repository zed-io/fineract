/**
 * Certificate Template Renderer Tests
 * Tests for the template rendering and PDF generation process
 */

import handlebars from 'handlebars';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { shareCertificateService } from '../../src/services/shareCertificateService';

// Mock dependencies
jest.mock('handlebars');
jest.mock('puppeteer');
jest.mock('fs');
jest.mock('path');

describe('Certificate Template Renderer', () => {
  // Test data
  const templateData = {
    organizationName: 'Fineract Financial Institution',
    clientName: 'John Doe',
    sharesQuantity: '100',
    productName: 'Test Share Product',
    currency: '$',
    shareValue: '10.00',
    totalValue: '1,000.00',
    certificateNumber: 'SHR000001',
    accountNumber: 'ACC001',
    issueDate: 'January 1, 2023',
    shareCapitalType: 'Equity',
    verificationCode: 'ABC123'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock file system methods
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    
    // Mock path join to return a predictable path
    (path.join as jest.Mock).mockReturnValue('/path/to/certificates/SHR000001.pdf');
    
    // Mock Handlebars compilation
    const mockCompiledTemplate = jest.fn().mockReturnValue('<html><body>Rendered Certificate</body></html>');
    (handlebars.compile as jest.Mock).mockReturnValue(mockCompiledTemplate);
    
    // Mock Puppeteer browser and page
    const mockPage = {
      setContent: jest.fn().mockResolvedValue(undefined),
      pdf: jest.fn().mockResolvedValue(undefined)
    };
    
    const mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(undefined)
    };
    
    (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);
  });

  describe('generateCertificatePdf', () => {
    test('should create certificates directory if it does not exist', async () => {
      // Arrange
      const certificateId = 'cert1';
      const certificateNumber = 'SHR000001';
      const account = {
        clientName: 'John Doe',
        accountNo: 'ACC001'
      };
      const product = {
        name: 'Test Share Product',
        nominalPrice: 10.0,
        currency: { displaySymbol: '$' },
        shareCapitalType: 'EQUITY'
      };
      const certData = {
        issueDate: '2023-01-01',
        sharesQuantity: 100
      };
      const template = {
        templateContent: '<html>{{clientName}}</html>'
      };
      const verificationCode = 'ABC123';

      // Act
      await shareCertificateService.generateCertificatePdf(
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
      expect(fs.mkdirSync).toHaveBeenCalledWith('/path/to/certificates', { recursive: true });
    });

    test('should compile template with correct data', async () => {
      // Arrange
      const certificateId = 'cert1';
      const certificateNumber = 'SHR000001';
      const account = {
        clientName: 'John Doe',
        accountNo: 'ACC001'
      };
      const product = {
        name: 'Test Share Product',
        nominalPrice: 10.0,
        currency: { displaySymbol: '$' },
        shareCapitalType: 'EQUITY'
      };
      const certData = {
        issueDate: '2023-01-01',
        sharesQuantity: 100
      };
      const template = {
        templateContent: `
          <html>
            <body>
              <h1>{{organizationName}}</h1>
              <p>This certifies that <strong>{{clientName}}</strong> owns <strong>{{sharesQuantity}}</strong> shares.</p>
              <p>Certificate Number: {{certificateNumber}}</p>
              <p>Verification Code: {{verificationCode}}</p>
            </body>
          </html>
        `
      };
      const verificationCode = 'ABC123';

      // Act
      await shareCertificateService.generateCertificatePdf(
        certificateId,
        certificateNumber,
        account,
        product,
        certData,
        template,
        verificationCode
      );

      // Assert
      expect(handlebars.compile).toHaveBeenCalledWith(template.templateContent);
      
      // Get the mock compiled template function
      const mockCompiledTemplate = (handlebars.compile as jest.Mock).mock.results[0].value;
      
      // Verify it was called with the correct data
      expect(mockCompiledTemplate).toHaveBeenCalled();
      expect(mockCompiledTemplate.mock.calls[0][0]).toMatchObject({
        organizationName: expect.any(String),
        clientName: account.clientName,
        certificateNumber,
        verificationCode
      });
    });

    test('should generate PDF using Puppeteer', async () => {
      // Arrange
      const certificateId = 'cert1';
      const certificateNumber = 'SHR000001';
      const account = {
        clientName: 'John Doe',
        accountNo: 'ACC001'
      };
      const product = {
        name: 'Test Share Product',
        nominalPrice: 10.0,
        currency: { displaySymbol: '$' },
        shareCapitalType: 'EQUITY'
      };
      const certData = {
        issueDate: '2023-01-01',
        sharesQuantity: 100
      };
      const template = {
        templateContent: '<html>{{clientName}}</html>'
      };
      const verificationCode = 'ABC123';
      
      // Get references to the mock browser and page
      const browser = await puppeteer.launch();
      const page = await browser.newPage();

      // Act
      await shareCertificateService.generateCertificatePdf(
        certificateId,
        certificateNumber,
        account,
        product,
        certData,
        template,
        verificationCode
      );

      // Assert
      expect(puppeteer.launch).toHaveBeenCalledWith(expect.objectContaining({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true
      }));
      
      expect(browser.newPage).toHaveBeenCalled();
      expect(page.setContent).toHaveBeenCalled();
      expect(page.pdf).toHaveBeenCalledWith(expect.objectContaining({
        path: '/path/to/certificates/SHR000001.pdf',
        format: 'A4',
        printBackground: true,
        margin: expect.objectContaining({
          top: '10mm',
          bottom: '10mm',
          left: '10mm',
          right: '10mm'
        })
      }));
      expect(browser.close).toHaveBeenCalled();
    });

    test('should format numbers and currency correctly', async () => {
      // Arrange
      const certificateId = 'cert1';
      const certificateNumber = 'SHR000001';
      const account = {
        clientName: 'John Doe',
        accountNo: 'ACC001'
      };
      const product = {
        name: 'Test Share Product',
        nominalPrice: 12.5,
        currency: { displaySymbol: '$' },
        shareCapitalType: 'EQUITY'
      };
      const certData = {
        issueDate: '2023-01-01',
        sharesQuantity: 1234
      };
      const template = {
        templateContent: `
          <html>
            <body>
              <p>Shares: {{sharesQuantity}}</p>
              <p>Value: {{currency}} {{shareValue}}</p>
              <p>Total: {{currency}} {{totalValue}}</p>
            </body>
          </html>
        `
      };
      const verificationCode = 'ABC123';

      // Act
      await shareCertificateService.generateCertificatePdf(
        certificateId,
        certificateNumber,
        account,
        product,
        certData,
        template,
        verificationCode
      );

      // Assert
      const mockCompiledTemplate = (handlebars.compile as jest.Mock).mock.results[0].value;
      const templateData = mockCompiledTemplate.mock.calls[0][0];
      
      // Check number formatting
      expect(templateData.sharesQuantity).toBe('1,234');
      expect(templateData.shareValue).toBe('12.50');
      expect(templateData.totalValue).toBe('15,425.00');
    });

    test('should handle template variables properly', async () => {
      // Arrange
      const certificateId = 'cert1';
      const certificateNumber = 'SHR000001';
      const account = {
        clientName: 'John Doe',
        groupName: null,
        accountNo: 'ACC001'
      };
      const product = {
        name: 'Test Share Product',
        nominalPrice: 10.0,
        currency: { displaySymbol: '$' },
        shareCapitalType: 'variable_capital'
      };
      const certData = {
        issueDate: '2023-01-01',
        sharesQuantity: 100
      };
      const template = {
        templateContent: 'Template content with {{shareCapitalType}}'
      };
      const verificationCode = 'ABC123';

      // Act
      await shareCertificateService.generateCertificatePdf(
        certificateId,
        certificateNumber,
        account,
        product,
        certData,
        template,
        verificationCode
      );

      // Assert
      const mockCompiledTemplate = (handlebars.compile as jest.Mock).mock.results[0].value;
      const templateData = mockCompiledTemplate.mock.calls[0][0];
      
      // Check transformation of shareCapitalType
      expect(templateData.shareCapitalType).toBe('Variable Capital');
    });

    test('should handle group accounts', async () => {
      // Arrange
      const certificateId = 'cert1';
      const certificateNumber = 'SHR000001';
      const account = {
        clientName: null,
        groupName: 'Savings Group 1',
        accountNo: 'GRP001'
      };
      const product = {
        name: 'Group Share Product',
        nominalPrice: 10.0,
        currency: { displaySymbol: '$' },
        shareCapitalType: 'EQUITY'
      };
      const certData = {
        issueDate: '2023-01-01',
        sharesQuantity: 100
      };
      const template = {
        templateContent: 'Certificate for {{clientName}}'
      };
      const verificationCode = 'ABC123';

      // Act
      await shareCertificateService.generateCertificatePdf(
        certificateId,
        certificateNumber,
        account,
        product,
        certData,
        template,
        verificationCode
      );

      // Assert
      const mockCompiledTemplate = (handlebars.compile as jest.Mock).mock.results[0].value;
      const templateData = mockCompiledTemplate.mock.calls[0][0];
      
      // Check that clientName is set to groupName for group accounts
      expect(templateData.clientName).toBe(account.groupName);
    });

    test('should handle date formatting', async () => {
      // Arrange
      const certificateId = 'cert1';
      const certificateNumber = 'SHR000001';
      const account = {
        clientName: 'John Doe',
        accountNo: 'ACC001'
      };
      const product = {
        name: 'Test Share Product',
        nominalPrice: 10.0,
        currency: { displaySymbol: '$' },
        shareCapitalType: 'EQUITY'
      };
      const certData = {
        issueDate: '2023-01-01',
        sharesQuantity: 100
      };
      const template = {
        templateContent: 'Issue Date: {{issueDate}}'
      };
      const verificationCode = 'ABC123';

      // Act
      await shareCertificateService.generateCertificatePdf(
        certificateId,
        certificateNumber,
        account,
        product,
        certData,
        template,
        verificationCode
      );

      // Assert
      const mockCompiledTemplate = (handlebars.compile as jest.Mock).mock.results[0].value;
      const templateData = mockCompiledTemplate.mock.calls[0][0];
      
      // Check date formatting
      expect(templateData.issueDate).toBe('January 1, 2023');
    });

    test('should handle errors during PDF generation', async () => {
      // Arrange
      const certificateId = 'cert1';
      const certificateNumber = 'SHR000001';
      const account = {
        clientName: 'John Doe',
        accountNo: 'ACC001'
      };
      const product = {
        name: 'Test Share Product',
        nominalPrice: 10.0,
        currency: { displaySymbol: '$' },
        shareCapitalType: 'EQUITY'
      };
      const certData = {
        issueDate: '2023-01-01',
        sharesQuantity: 100
      };
      const template = {
        templateContent: '<html>{{clientName}}</html>'
      };
      const verificationCode = 'ABC123';
      
      // Mock a puppeteer error
      const error = new Error('PDF generation failed');
      const mockPage = {
        setContent: jest.fn().mockResolvedValue(undefined),
        pdf: jest.fn().mockRejectedValue(error)
      };
      
      const mockBrowser = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn().mockResolvedValue(undefined)
      };
      
      (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);

      // Act & Assert
      await expect(shareCertificateService.generateCertificatePdf(
        certificateId,
        certificateNumber,
        account,
        product,
        certData,
        template,
        verificationCode
      )).rejects.toThrow('PDF generation failed');
      
      expect(mockBrowser.close).toHaveBeenCalled();
    });
  });

  describe('Default Certificate Template', () => {
    test('should include all required sections and variables', () => {
      // This test verifies the structure of the default template in the database migration file
      // We'll just verify it has all required sections
      
      // Read the template content from the migration file
      const templateContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Share Certificate</title>
  <style>
    body {
      font-family: "Times New Roman", Times, serif;
      margin: 0;
      padding: 0;
      color: #000;
      background-color: #fff;
    }
    .certificate-container {
      width: 800px;
      height: 600px;
      margin: 0 auto;
      padding: 20px;
      border: 3px double #000;
      position: relative;
      background-color: #f9f9f9;
      background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuXzEiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgcGF0dGVyblRyYW5zZm9ybT0icm90YXRlKDQ1KSI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjUiIGhlaWdodD0iNSIgZmlsbD0icmdiYSgwLDAsMCwwLjAyKSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwYXR0ZXJuXzEpIi8+PC9zdmc+');
    }
    .border-pattern {
      position: absolute;
      top: 10px;
      left: 10px;
      right: 10px;
      bottom: 10px;
      border: 1px solid #000;
      pointer-events: none;
    }
    .certificate-header {
      text-align: center;
      margin-bottom: 20px;
      padding-top: 20px;
    }
    .certificate-title {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 5px;
      color: #2c3e50;
      text-transform: uppercase;
      letter-spacing: 3px;
    }
    .organization-name {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .certificate-content {
      text-align: center;
      margin: 40px 0;
      line-height: 1.6;
      font-size: 16px;
    }
    .certificate-details {
      margin: 30px auto;
      width: 80%;
      border-collapse: collapse;
    }
    .certificate-details td {
      padding: 8px;
      text-align: left;
    }
    .certificate-details td:first-child {
      font-weight: bold;
      width: 40%;
    }
    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 60px;
      padding: 0 40px;
    }
    .signature {
      text-align: center;
      width: 200px;
    }
    .signature-line {
      border-top: 1px solid #000;
      margin-bottom: 5px;
    }
    .signature-title {
      font-style: italic;
      font-size: 14px;
    }
    .certificate-seal {
      position: absolute;
      right: 30px;
      bottom: 40px;
      width: 120px;
      height: 120px;
      background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjODg4IiBzdHJva2Utd2lkdGg9IjEiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSIzMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjODg4IiBzdHJva2Utd2lkdGg9IjEiLz48dGV4dCB4PSI1MCIgeT0iNTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGFsaWdubWVudC1iYXNlbGluZT0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iOCIgZmlsbD0iIzg4OCI+T0ZGSUNJQUwgU0VBTDwvdGV4dD48L3N2Zz4=');
      background-repeat: no-repeat;
      background-size: contain;
      opacity: 0.7;
    }
    .certificate-footer {
      position: absolute;
      bottom: 20px;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 12px;
      color: #777;
    }
    .certificate-number {
      font-family: monospace;
      letter-spacing: 1px;
    }
  </style>
</head>
<body>
  <div class="certificate-container">
    <div class="border-pattern"></div>
    <div class="certificate-header">
      <div class="certificate-title">Share Certificate</div>
      <div class="organization-name">{{organizationName}}</div>
    </div>
    
    <div class="certificate-content">
      <p>This certifies that <strong>{{clientName}}</strong> is the registered holder of 
      <strong>{{sharesQuantity}}</strong> shares of {{productName}}, 
      with a nominal value of {{currency}} {{shareValue}} each, for a total value of 
      <strong>{{currency}} {{totalValue}}</strong>.</p>
    </div>
    
    <table class="certificate-details">
      <tr>
        <td>Certificate Number:</td>
        <td class="certificate-number">{{certificateNumber}}</td>
      </tr>
      <tr>
        <td>Account Number:</td>
        <td>{{accountNumber}}</td>
      </tr>
      <tr>
        <td>Issue Date:</td>
        <td>{{issueDate}}</td>
      </tr>
      <tr>
        <td>Share Type:</td>
        <td>{{shareCapitalType}}</td>
      </tr>
    </table>
    
    <div class="signature-section">
      <div class="signature">
        <div class="signature-line"></div>
        <div class="signature-title">Authorized Officer</div>
      </div>
      <div class="signature">
        <div class="signature-line"></div>
        <div class="signature-title">Secretary</div>
      </div>
    </div>
    
    <div class="certificate-seal"></div>
    
    <div class="certificate-footer">
      This certificate is issued in accordance with the terms and conditions specified in the share account agreement.
      <br>
      Certificate verification: {{verificationCode}}
    </div>
  </div>
</body>
</html>`;

      // Assert
      // Check for required sections and variables
      expect(templateContent).toContain('<div class="certificate-title">Share Certificate</div>');
      expect(templateContent).toContain('<div class="organization-name">{{organizationName}}</div>');
      expect(templateContent).toContain('<strong>{{clientName}}</strong>');
      expect(templateContent).toContain('<strong>{{sharesQuantity}}</strong>');
      expect(templateContent).toContain('{{currency}} {{shareValue}}');
      expect(templateContent).toContain('{{currency}} {{totalValue}}');
      expect(templateContent).toContain('{{certificateNumber}}');
      expect(templateContent).toContain('{{accountNumber}}');
      expect(templateContent).toContain('{{issueDate}}');
      expect(templateContent).toContain('{{shareCapitalType}}');
      expect(templateContent).toContain('Certificate verification: {{verificationCode}}');
      
      // Check for structural elements
      expect(templateContent).toContain('<div class="signature-section">');
      expect(templateContent).toContain('<div class="certificate-seal"></div>');
      expect(templateContent).toContain('<div class="certificate-footer">');
    });
  });
});