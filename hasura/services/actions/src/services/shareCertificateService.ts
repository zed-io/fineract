/**
 * Share Certificate Service
 * Handles all the business logic for share certificate operations
 */

import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import { shareService } from './shareService';
import { initDatabase } from '../utils/db';
import { logger } from '../utils/logger';

/**
 * Service for managing share certificates
 */
export const shareCertificateService = {
  
  /**
   * Get all certificate templates
   */
  async getTemplates() {
    try {
      const db = await initDatabase();
      const templates = await db.query(`
        SELECT * FROM share_certificate_template
        ORDER BY created_date DESC
      `);
      
      return { templates };
    } catch (error) {
      logger.error('Error getting certificate templates', { error });
      throw error;
    }
  },
  
  /**
   * Get certificate template by ID
   */
  async getTemplate(templateId: string) {
    try {
      const db = await initDatabase();
      const result = await db.query(`
        SELECT * FROM share_certificate_template
        WHERE id = $1
      `, [templateId]);
      
      if (result.length === 0) {
        throw new Error(`Certificate template with ID ${templateId} not found`);
      }
      
      return { template: result[0] };
    } catch (error) {
      logger.error('Error getting certificate template', { error });
      throw error;
    }
  },
  
  /**
   * Create new certificate template
   */
  async createTemplate(templateData: any, userId: string) {
    try {
      const db = await initDatabase();
      
      // Check if this is set as default and update other templates if needed
      if (templateData.isDefault) {
        await db.query(`
          UPDATE share_certificate_template
          SET is_default = FALSE
          WHERE is_default = TRUE
        `);
      }
      
      const templateId = uuidv4();
      await db.query(`
        INSERT INTO share_certificate_template (
          id, name, description, template_content, 
          is_active, is_default
        ) VALUES (
          $1, $2, $3, $4, $5, $6
        )
      `, [
        templateId,
        templateData.name,
        templateData.description || null,
        templateData.templateContent,
        templateData.isActive !== undefined ? templateData.isActive : true,
        templateData.isDefault !== undefined ? templateData.isDefault : false
      ]);
      
      return { 
        templateId,
        name: templateData.name
      };
    } catch (error) {
      logger.error('Error creating certificate template', { error });
      throw error;
    }
  },
  
  /**
   * Update certificate template
   */
  async updateTemplate(templateId: string, templateData: any, userId: string) {
    try {
      const db = await initDatabase();
      
      // Check if the template exists
      const existingTemplate = await db.query(`
        SELECT * FROM share_certificate_template
        WHERE id = $1
      `, [templateId]);
      
      if (existingTemplate.length === 0) {
        throw new Error(`Certificate template with ID ${templateId} not found`);
      }
      
      // Check if this is set as default and update other templates if needed
      if (templateData.isDefault) {
        await db.query(`
          UPDATE share_certificate_template
          SET is_default = FALSE
          WHERE is_default = TRUE AND id != $1
        `, [templateId]);
      }
      
      // Build the update query dynamically based on the provided fields
      const updateFields = [];
      const queryParams = [templateId];
      let paramIndex = 2;
      
      if (templateData.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        queryParams.push(templateData.name);
      }
      
      if (templateData.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        queryParams.push(templateData.description);
      }
      
      if (templateData.templateContent !== undefined) {
        updateFields.push(`template_content = $${paramIndex++}`);
        queryParams.push(templateData.templateContent);
      }
      
      if (templateData.isActive !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        queryParams.push(templateData.isActive);
      }
      
      if (templateData.isDefault !== undefined) {
        updateFields.push(`is_default = $${paramIndex++}`);
        queryParams.push(templateData.isDefault);
      }
      
      if (updateFields.length === 0) {
        return { 
          templateId,
          name: existingTemplate[0].name,
          updated: false
        };
      }
      
      await db.query(`
        UPDATE share_certificate_template
        SET ${updateFields.join(', ')}
        WHERE id = $1
      `, queryParams);
      
      return { 
        templateId,
        name: templateData.name || existingTemplate[0].name,
        updated: true
      };
    } catch (error) {
      logger.error('Error updating certificate template', { error });
      throw error;
    }
  },
  
  /**
   * Get all certificate series for a product
   */
  async getSeriesList(productId: string) {
    try {
      const db = await initDatabase();
      
      // Verify product exists
      const product = await shareService.getProduct(productId);
      
      const seriesList = await db.query(`
        SELECT s.*, p.name as product_name
        FROM share_certificate_series s
        JOIN share_product p ON s.product_id = p.id
        WHERE s.product_id = $1
        ORDER BY s.created_date DESC
      `, [productId]);
      
      return { seriesList };
    } catch (error) {
      logger.error('Error getting certificate series list', { error });
      throw error;
    }
  },
  
  /**
   * Create new certificate series
   */
  async createSeries(seriesData: any, userId: string) {
    try {
      const db = await initDatabase();
      
      // Verify product exists
      const product = await shareService.getProduct(seriesData.productId);
      
      // Check if there's already a series with the same prefix for this product
      const existingSeries = await db.query(`
        SELECT * FROM share_certificate_series
        WHERE product_id = $1 AND prefix = $2
      `, [seriesData.productId, seriesData.prefix]);
      
      if (existingSeries.length > 0) {
        throw new Error(`A certificate series with prefix '${seriesData.prefix}' already exists for this product`);
      }
      
      const seriesId = uuidv4();
      await db.query(`
        INSERT INTO share_certificate_series (
          id, product_id, prefix, next_number, is_active
        ) VALUES (
          $1, $2, $3, $4, $5
        )
      `, [
        seriesId,
        seriesData.productId,
        seriesData.prefix,
        seriesData.nextNumber || 1,
        seriesData.isActive !== undefined ? seriesData.isActive : true
      ]);
      
      return { 
        seriesId,
        prefix: seriesData.prefix
      };
    } catch (error) {
      logger.error('Error creating certificate series', { error });
      throw error;
    }
  },
  
  /**
   * Update certificate series
   */
  async updateSeries(seriesId: string, seriesData: any, userId: string) {
    try {
      const db = await initDatabase();
      
      // Check if the series exists
      const existingSeries = await db.query(`
        SELECT * FROM share_certificate_series
        WHERE id = $1
      `, [seriesId]);
      
      if (existingSeries.length === 0) {
        throw new Error(`Certificate series with ID ${seriesId} not found`);
      }
      
      // Check for prefix uniqueness if changing prefix
      if (seriesData.prefix && seriesData.prefix !== existingSeries[0].prefix) {
        const duplicatePrefix = await db.query(`
          SELECT * FROM share_certificate_series
          WHERE product_id = $1 AND prefix = $2 AND id != $3
        `, [existingSeries[0].product_id, seriesData.prefix, seriesId]);
        
        if (duplicatePrefix.length > 0) {
          throw new Error(`A certificate series with prefix '${seriesData.prefix}' already exists for this product`);
        }
      }
      
      // Build the update query dynamically based on the provided fields
      const updateFields = [];
      const queryParams = [seriesId];
      let paramIndex = 2;
      
      if (seriesData.prefix !== undefined) {
        updateFields.push(`prefix = $${paramIndex++}`);
        queryParams.push(seriesData.prefix);
      }
      
      if (seriesData.nextNumber !== undefined) {
        updateFields.push(`next_number = $${paramIndex++}`);
        queryParams.push(seriesData.nextNumber);
      }
      
      if (seriesData.isActive !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        queryParams.push(seriesData.isActive);
      }
      
      if (updateFields.length === 0) {
        return { 
          seriesId,
          prefix: existingSeries[0].prefix,
          updated: false
        };
      }
      
      await db.query(`
        UPDATE share_certificate_series
        SET ${updateFields.join(', ')}
        WHERE id = $1
      `, queryParams);
      
      return { 
        seriesId,
        prefix: seriesData.prefix || existingSeries[0].prefix,
        updated: true
      };
    } catch (error) {
      logger.error('Error updating certificate series', { error });
      throw error;
    }
  },
  
  /**
   * Generate a new share certificate
   */
  async generateCertificate(certData: any, userId: string) {
    try {
      const db = await initDatabase();
      
      // Get the share account details
      const account = await shareService.getAccount(certData.accountId);
      
      // Verify there's a series for this product
      const seriesList = await db.query(`
        SELECT * FROM share_certificate_series
        WHERE product_id = $1 AND is_active = TRUE
      `, [account.productId]);
      
      if (seriesList.length === 0) {
        throw new Error(`No active certificate series found for product ${account.productName}`);
      }
      
      // Use the first active series
      const series = seriesList[0];
      
      // Get template
      let templateId = certData.templateId;
      if (!templateId) {
        // Find the default template
        const defaultTemplate = await db.query(`
          SELECT id FROM share_certificate_template
          WHERE is_default = TRUE AND is_active = TRUE
        `);
        
        if (defaultTemplate.length === 0) {
          throw new Error('No default certificate template found');
        }
        
        templateId = defaultTemplate[0].id;
      }
      
      const template = await this.getTemplate(templateId);
      
      // Generate verification code (8 alphanumeric characters)
      const verificationCode = crypto.randomBytes(4).toString('hex').toUpperCase();
      
      // Generate certificate number
      const certificateNumber = `${series.prefix}${series.next_number.toString().padStart(6, '0')}`;
      
      // Update the series next number with transaction
      await db.query('BEGIN');
      
      try {
        // Get the share price from the product
        const product = await shareService.getProduct(account.productId);
        
        // Create certificate record
        const certificateId = uuidv4();
        await db.query(`
          INSERT INTO share_certificate (
            id, certificate_number, account_id, template_id, series_id,
            issue_date, issued_by, expiry_date,
            shares_quantity, share_value, total_value,
            status, notes, is_digital, verification_code
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
          )
        `, [
          certificateId,
          certificateNumber,
          certData.accountId,
          templateId,
          series.id,
          certData.issueDate,
          userId,
          certData.expiryDate || null,
          certData.sharesQuantity,
          product.nominalPrice,
          product.nominalPrice * certData.sharesQuantity,
          'active',
          certData.notes || null,
          true,
          verificationCode
        ]);
        
        // Update the series next number
        await db.query(`
          UPDATE share_certificate_series
          SET next_number = next_number + 1
          WHERE id = $1
        `, [series.id]);
        
        // Generate the PDF
        const pdfPath = await this.generateCertificatePdf(
          certificateId,
          certificateNumber,
          account,
          product,
          certData,
          template.template,
          verificationCode
        );
        
        // Update the certificate record with the document path
        await db.query(`
          UPDATE share_certificate
          SET document_path = $1
          WHERE id = $2
        `, [pdfPath, certificateId]);
        
        await db.query('COMMIT');
        
        // Generate the download URL
        const downloadUrl = `/api/share/certificate/download?id=${certificateId}&format=pdf`;
        
        return {
          certificateId,
          certificateNumber,
          accountId: certData.accountId,
          issueDate: certData.issueDate,
          sharesQuantity: certData.sharesQuantity,
          downloadUrl
        };
      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      logger.error('Error generating certificate', { error });
      throw error;
    }
  },
  
  /**
   * Generate a PDF from the certificate template
   */
  async generateCertificatePdf(
    certificateId: string,
    certificateNumber: string,
    account: any,
    product: any,
    certData: any,
    template: any,
    verificationCode: string
  ) {
    try {
      // Create directory for certificates if it doesn't exist
      const certificatesDir = path.join(__dirname, '..', '..', 'certificates');
      if (!fs.existsSync(certificatesDir)) {
        fs.mkdirSync(certificatesDir, { recursive: true });
      }
      
      // Prepare the data for the template
      const organizationName = "Fineract Financial Institution"; // This should come from configuration
      
      // Format numbers with commas
      const formatNumber = (num) => {
        return new Intl.NumberFormat('en-US').format(num);
      };
      
      // Format currency
      const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(amount);
      };
      
      const templateData = {
        organizationName,
        clientName: account.clientName || account.groupName,
        sharesQuantity: formatNumber(certData.sharesQuantity),
        productName: product.name,
        currency: product.currency.displaySymbol,
        shareValue: formatCurrency(product.nominalPrice),
        totalValue: formatCurrency(product.nominalPrice * certData.sharesQuantity),
        certificateNumber,
        accountNumber: account.accountNo,
        issueDate: new Date(certData.issueDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        shareCapitalType: product.shareCapitalType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        verificationCode
      };
      
      // Compile the template
      const compiledTemplate = handlebars.compile(template.templateContent);
      const html = compiledTemplate(templateData);
      
      // Generate PDF using puppeteer
      const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true
      });
      
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      // Create the output file path
      const outputPath = path.join(certificatesDir, `${certificateNumber}.pdf`);
      
      // Generate PDF
      await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '10mm',
          bottom: '10mm',
          left: '10mm',
          right: '10mm'
        }
      });
      
      await browser.close();
      
      return outputPath;
    } catch (error) {
      logger.error('Error generating certificate PDF', { error });
      throw error;
    }
  },
  
  /**
   * Get certificate by ID
   */
  async getCertificate(certificateId: string) {
    try {
      const db = await initDatabase();
      
      const result = await db.query(`
        SELECT 
          c.*,
          a.account_no as account_number,
          cl.id as client_id,
          CONCAT(cl.firstname, ' ', cl.lastname) as client_name,
          g.id as group_id,
          g.name as group_name,
          p.id as product_id,
          p.name as product_name,
          t.name as template_name,
          s.prefix as series_prefix,
          u1.username as issued_by_username,
          u1.firstname as issued_by_firstname,
          u1.lastname as issued_by_lastname,
          u2.username as revoked_by_username,
          u2.firstname as revoked_by_firstname,
          u2.lastname as revoked_by_lastname
        FROM share_certificate c
        JOIN share_account a ON c.account_id = a.id
        LEFT JOIN client cl ON a.client_id = cl.id
        LEFT JOIN groups g ON a.group_id = g.id
        JOIN share_product p ON a.product_id = p.id
        JOIN share_certificate_template t ON c.template_id = t.id
        JOIN share_certificate_series s ON c.series_id = s.id
        LEFT JOIN users u1 ON c.issued_by = u1.id
        LEFT JOIN users u2 ON c.revoked_by = u2.id
        WHERE c.id = $1
      `, [certificateId]);
      
      if (result.length === 0) {
        throw new Error(`Certificate with ID ${certificateId} not found`);
      }
      
      return { certificate: result[0] };
    } catch (error) {
      logger.error('Error getting certificate', { error });
      throw error;
    }
  },
  
  /**
   * Get all certificates for an account
   */
  async getCertificates(accountId: string) {
    try {
      const db = await initDatabase();
      
      // Verify account exists
      const account = await shareService.getAccount(accountId);
      
      const certificates = await db.query(`
        SELECT 
          c.*,
          a.account_no as account_number,
          cl.id as client_id,
          CONCAT(cl.firstname, ' ', cl.lastname) as client_name,
          g.id as group_id,
          g.name as group_name,
          p.id as product_id,
          p.name as product_name,
          t.name as template_name,
          s.prefix as series_prefix,
          u1.username as issued_by_username,
          u1.firstname as issued_by_firstname,
          u1.lastname as issued_by_lastname,
          u2.username as revoked_by_username,
          u2.firstname as revoked_by_firstname,
          u2.lastname as revoked_by_lastname
        FROM share_certificate c
        JOIN share_account a ON c.account_id = a.id
        LEFT JOIN client cl ON a.client_id = cl.id
        LEFT JOIN groups g ON a.group_id = g.id
        JOIN share_product p ON a.product_id = p.id
        JOIN share_certificate_template t ON c.template_id = t.id
        JOIN share_certificate_series s ON c.series_id = s.id
        LEFT JOIN users u1 ON c.issued_by = u1.id
        LEFT JOIN users u2 ON c.revoked_by = u2.id
        WHERE c.account_id = $1
        ORDER BY c.issue_date DESC
      `, [accountId]);
      
      return { certificates };
    } catch (error) {
      logger.error('Error getting certificates', { error });
      throw error;
    }
  },
  
  /**
   * Revoke a certificate
   */
  async revokeCertificate(certificateId: string, revocationData: any, userId: string) {
    try {
      const db = await initDatabase();
      
      // Check if certificate exists and is active
      const certificate = await this.getCertificate(certificateId);
      
      if (certificate.certificate.status !== 'active') {
        throw new Error(`Certificate is not active and cannot be revoked. Current status: ${certificate.certificate.status}`);
      }
      
      // Update the certificate status
      await db.query(`
        UPDATE share_certificate
        SET status = 'revoked',
            revocation_date = $1,
            revoked_by = $2,
            notes = CASE 
              WHEN notes IS NULL OR notes = '' THEN $3
              ELSE notes || ' | Revocation reason: ' || $3
            END
        WHERE id = $4
      `, [
        revocationData.revocationDate,
        userId,
        revocationData.reason,
        certificateId
      ]);
      
      return {
        certificateId,
        certificateNumber: certificate.certificate.certificate_number,
        revocationDate: revocationData.revocationDate,
        status: 'revoked'
      };
    } catch (error) {
      logger.error('Error revoking certificate', { error });
      throw error;
    }
  },
  
  /**
   * Regenerate a certificate (replacing a revoked one)
   */
  async regenerateCertificate(certificateId: string, regenerateData: any, userId: string) {
    try {
      const db = await initDatabase();
      
      // Get the original certificate
      const originalCert = await this.getCertificate(certificateId);
      
      // Check if certificate can be regenerated (must be revoked or expired)
      if (originalCert.certificate.status !== 'revoked' && originalCert.certificate.status !== 'expired') {
        throw new Error(`Only revoked or expired certificates can be regenerated. Current status: ${originalCert.certificate.status}`);
      }
      
      // Get the account details
      const account = await shareService.getAccount(originalCert.certificate.account_id);
      
      // Update the original certificate status if it's not already marked as replaced
      if (originalCert.certificate.status !== 'replaced') {
        await db.query(`
          UPDATE share_certificate
          SET status = 'replaced'
          WHERE id = $1
        `, [certificateId]);
      }
      
      // Generate a new certificate
      const newCertData = {
        accountId: originalCert.certificate.account_id,
        templateId: regenerateData.newTemplateId || originalCert.certificate.template_id,
        issueDate: regenerateData.newIssueDate,
        expiryDate: regenerateData.newExpiryDate,
        sharesQuantity: originalCert.certificate.shares_quantity,
        notes: regenerateData.notes || `Regenerated from certificate ${originalCert.certificate.certificate_number}`
      };
      
      // Generate the new certificate
      const newCert = await this.generateCertificate(newCertData, userId);
      
      return {
        originalCertificateId: certificateId,
        newCertificateId: newCert.certificateId,
        newCertificateNumber: newCert.certificateNumber,
        issueDate: newCert.issueDate,
        status: 'active',
        downloadUrl: newCert.downloadUrl
      };
    } catch (error) {
      logger.error('Error regenerating certificate', { error });
      throw error;
    }
  },
  
  /**
   * Download a certificate
   */
  async downloadCertificate(certificateId: string, format: string = 'pdf') {
    try {
      const db = await initDatabase();
      
      // Get the certificate
      const certificate = await this.getCertificate(certificateId);
      
      if (!certificate.certificate.document_path) {
        throw new Error('Certificate document not found');
      }
      
      // For now, we only support PDF format
      if (format !== 'pdf') {
        throw new Error(`Unsupported format: ${format}. Only PDF is currently supported.`);
      }
      
      // Generate a temporary download URL that expires after 10 minutes
      const downloadUrl = `/api/share/certificate/download?id=${certificateId}&format=pdf`;
      
      return {
        certificateId,
        certificateNumber: certificate.certificate.certificate_number,
        downloadUrl,
        format: 'pdf',
        expiryTime: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes from now
      };
    } catch (error) {
      logger.error('Error downloading certificate', { error });
      throw error;
    }
  },
  
  /**
   * Verify a certificate
   */
  async verifyCertificate(certificateNumber: string, verificationCode: string) {
    try {
      const db = await initDatabase();
      
      // Find the certificate by number and verification code
      const result = await db.query(`
        SELECT 
          c.*,
          a.account_no as account_number,
          cl.id as client_id,
          CONCAT(cl.firstname, ' ', cl.lastname) as client_name,
          g.id as group_id,
          g.name as group_name,
          p.id as product_id,
          p.name as product_name,
          t.name as template_name,
          s.prefix as series_prefix
        FROM share_certificate c
        JOIN share_account a ON c.account_id = a.id
        LEFT JOIN client cl ON a.client_id = cl.id
        LEFT JOIN groups g ON a.group_id = g.id
        JOIN share_product p ON a.product_id = p.id
        JOIN share_certificate_template t ON c.template_id = t.id
        JOIN share_certificate_series s ON c.series_id = s.id
        WHERE c.certificate_number = $1 AND c.verification_code = $2
      `, [certificateNumber, verificationCode]);
      
      if (result.length === 0) {
        return {
          isValid: false,
          message: 'Certificate not found or verification code is incorrect'
        };
      }
      
      const certificate = result[0];
      
      // Check the status
      if (certificate.status !== 'active') {
        return {
          isValid: false,
          certificate,
          message: `Certificate is not active. Current status: ${certificate.status}`
        };
      }
      
      // Check if the certificate has expired
      if (certificate.expiry_date && new Date(certificate.expiry_date) < new Date()) {
        return {
          isValid: false,
          certificate,
          message: 'Certificate has expired'
        };
      }
      
      return {
        isValid: true,
        certificate,
        message: 'Certificate is valid'
      };
    } catch (error) {
      logger.error('Error verifying certificate', { error });
      throw error;
    }
  },
  
  /**
   * Get all certificate batches
   */
  async getBatches(productId?: string, status?: string) {
    try {
      const db = await initDatabase();
      
      let query = `
        SELECT 
          b.*,
          p.name as product_name,
          t.name as template_name,
          s.prefix as series_prefix,
          u.username as started_by_username,
          u.firstname as started_by_firstname,
          u.lastname as started_by_lastname
        FROM share_certificate_batch b
        LEFT JOIN share_product p ON b.product_id = p.id
        JOIN share_certificate_template t ON b.template_id = t.id
        JOIN share_certificate_series s ON b.series_id = s.id
        LEFT JOIN users u ON b.started_by = u.id
      `;
      
      const queryParams = [];
      const conditions = [];
      
      if (productId) {
        conditions.push(`b.product_id = $${queryParams.length + 1}`);
        queryParams.push(productId);
      }
      
      if (status) {
        conditions.push(`b.status = $${queryParams.length + 1}`);
        queryParams.push(status);
      }
      
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      query += ' ORDER BY b.started_date DESC';
      
      const batches = await db.query(query, queryParams);
      
      return { batches };
    } catch (error) {
      logger.error('Error getting certificate batches', { error });
      throw error;
    }
  },
  
  /**
   * Get certificate batch by ID
   */
  async getBatch(batchId: string) {
    try {
      const db = await initDatabase();
      
      // Get the batch
      const batchResult = await db.query(`
        SELECT 
          b.*,
          p.name as product_name,
          t.name as template_name,
          s.prefix as series_prefix,
          u.username as started_by_username,
          u.firstname as started_by_firstname,
          u.lastname as started_by_lastname
        FROM share_certificate_batch b
        LEFT JOIN share_product p ON b.product_id = p.id
        JOIN share_certificate_template t ON b.template_id = t.id
        JOIN share_certificate_series s ON b.series_id = s.id
        LEFT JOIN users u ON b.started_by = u.id
        WHERE b.id = $1
      `, [batchId]);
      
      if (batchResult.length === 0) {
        throw new Error(`Certificate batch with ID ${batchId} not found`);
      }
      
      const batch = batchResult[0];
      
      // Get the batch items
      const items = await db.query(`
        SELECT 
          i.*,
          a.account_no as account_number,
          CASE 
            WHEN cl.id IS NOT NULL THEN CONCAT(cl.firstname, ' ', cl.lastname)
            WHEN g.id IS NOT NULL THEN g.name
            ELSE NULL
          END as client_or_group_name,
          c.certificate_number
        FROM share_certificate_batch_item i
        JOIN share_account a ON i.account_id = a.id
        LEFT JOIN client cl ON a.client_id = cl.id
        LEFT JOIN groups g ON a.group_id = g.id
        LEFT JOIN share_certificate c ON i.certificate_id = c.id
        WHERE i.batch_id = $1
        ORDER BY i.created_date ASC
      `, [batchId]);
      
      // Add items to the batch
      batch.items = items;
      
      return { batch };
    } catch (error) {
      logger.error('Error getting certificate batch', { error });
      throw error;
    }
  },
  
  /**
   * Start a new certificate batch process
   */
  async startBatch(batchData: any, userId: string) {
    try {
      const db = await initDatabase();
      
      // Begin transaction
      await db.query('BEGIN');
      
      try {
        // Get accounts to process
        let accounts = [];
        
        if (batchData.accountIds && batchData.accountIds.length > 0) {
          // Process specific accounts
          const accountPlaceholders = batchData.accountIds.map((_, idx) => `$${idx + 1}`).join(',');
          accounts = await db.query(`
            SELECT a.* 
            FROM share_account a
            WHERE a.id IN (${accountPlaceholders})
            AND a.status = 'active'
          `, batchData.accountIds);
        } else if (batchData.productId) {
          // Process all active accounts for a product
          accounts = await db.query(`
            SELECT a.* 
            FROM share_account a
            WHERE a.product_id = $1
            AND a.status = 'active'
          `, [batchData.productId]);
        } else {
          throw new Error('Either productId or accountIds must be provided');
        }
        
        if (accounts.length === 0) {
          throw new Error('No active accounts found to process');
        }
        
        // Create batch record
        const batchId = uuidv4();
        await db.query(`
          INSERT INTO share_certificate_batch (
            id, product_id, template_id, series_id,
            started_date, started_by,
            total_certificates, status, notes
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9
          )
        `, [
          batchId,
          batchData.productId || null,
          batchData.templateId,
          batchData.seriesId,
          new Date().toISOString(),
          userId,
          accounts.length,
          'pending',
          batchData.notes || null
        ]);
        
        // Create batch items
        for (const account of accounts) {
          const batchItemId = uuidv4();
          await db.query(`
            INSERT INTO share_certificate_batch_item (
              id, batch_id, account_id, status
            ) VALUES (
              $1, $2, $3, $4
            )
          `, [
            batchItemId,
            batchId,
            account.id,
            'pending'
          ]);
        }
        
        await db.query('COMMIT');
        
        // In a real implementation, you would start a background job here to process the batch
        // For this example, we'll assume a separate process will pick up and process pending batches
        
        return {
          batchId,
          status: 'pending',
          totalAccounts: accounts.length,
          message: `Batch certificate generation started for ${accounts.length} accounts`
        };
      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      logger.error('Error starting certificate batch', { error });
      throw error;
    }
  }
};