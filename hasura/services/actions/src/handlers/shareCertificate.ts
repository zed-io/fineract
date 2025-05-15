/**
 * Share Certificate API handlers for Fineract Hasura actions
 * Provides endpoints for share certificate management
 */

import { Request, Response } from 'express';
import fs from 'fs';
import { shareCertificateService } from '../services/shareCertificateService';
import { logger } from '../utils/logger';

/**
 * Share Certificate API handlers
 */
export const shareCertificateHandlers = {
  
  /**
   * Get all certificate templates
   */
  async getTemplates(req: Request, res: Response) {
    try {
      const templates = await shareCertificateService.getTemplates();
      res.json(templates);
    } catch (error: any) {
      logger.error('Error getting certificate templates', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Get certificate template by ID
   */
  async getTemplate(req: Request, res: Response) {
    try {
      const { templateId } = req.body.input;
      const template = await shareCertificateService.getTemplate(templateId);
      res.json(template);
    } catch (error: any) {
      logger.error('Error getting certificate template', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Create a new certificate template
   */
  async createTemplate(req: Request, res: Response) {
    try {
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const result = await shareCertificateService.createTemplate(req.body.input, userId);
      res.json(result);
    } catch (error: any) {
      logger.error('Error creating certificate template', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Update a certificate template
   */
  async updateTemplate(req: Request, res: Response) {
    try {
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const { templateId, ...templateData } = req.body.input;
      const result = await shareCertificateService.updateTemplate(templateId, templateData, userId);
      res.json(result);
    } catch (error: any) {
      logger.error('Error updating certificate template', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Get all certificate series for a product
   */
  async getSeriesList(req: Request, res: Response) {
    try {
      const { productId } = req.body.input;
      const seriesList = await shareCertificateService.getSeriesList(productId);
      res.json(seriesList);
    } catch (error: any) {
      logger.error('Error getting certificate series list', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Create a new certificate series
   */
  async createSeries(req: Request, res: Response) {
    try {
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const result = await shareCertificateService.createSeries(req.body.input, userId);
      res.json(result);
    } catch (error: any) {
      logger.error('Error creating certificate series', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Update a certificate series
   */
  async updateSeries(req: Request, res: Response) {
    try {
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const { seriesId, ...seriesData } = req.body.input;
      const result = await shareCertificateService.updateSeries(seriesId, seriesData, userId);
      res.json(result);
    } catch (error: any) {
      logger.error('Error updating certificate series', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Get certificate by ID
   */
  async getCertificate(req: Request, res: Response) {
    try {
      const { certificateId } = req.body.input;
      const certificate = await shareCertificateService.getCertificate(certificateId);
      res.json(certificate);
    } catch (error: any) {
      logger.error('Error getting certificate', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Get all certificates for an account
   */
  async getCertificates(req: Request, res: Response) {
    try {
      const { accountId } = req.body.input;
      const certificates = await shareCertificateService.getCertificates(accountId);
      res.json(certificates);
    } catch (error: any) {
      logger.error('Error getting certificates', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Generate a new certificate
   */
  async generateCertificate(req: Request, res: Response) {
    try {
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const result = await shareCertificateService.generateCertificate(req.body.input, userId);
      res.json(result);
    } catch (error: any) {
      logger.error('Error generating certificate', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Revoke a certificate
   */
  async revokeCertificate(req: Request, res: Response) {
    try {
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const { certificateId, revocationDate, reason } = req.body.input;
      const result = await shareCertificateService.revokeCertificate(
        certificateId, 
        { revocationDate, reason }, 
        userId
      );
      res.json(result);
    } catch (error: any) {
      logger.error('Error revoking certificate', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Regenerate a certificate
   */
  async regenerateCertificate(req: Request, res: Response) {
    try {
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const { certificateId, ...regenerateData } = req.body.input;
      const result = await shareCertificateService.regenerateCertificate(
        certificateId, 
        regenerateData, 
        userId
      );
      res.json(result);
    } catch (error: any) {
      logger.error('Error regenerating certificate', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Download a certificate
   */
  async downloadCertificate(req: Request, res: Response) {
    try {
      // For POST request from GraphQL
      if (req.body.input) {
        const { certificateId, format } = req.body.input;
        const result = await shareCertificateService.downloadCertificate(certificateId, format);
        res.json(result);
        return;
      }
      
      // For direct GET request from URL
      const { id, format } = req.query;
      
      if (!id) {
        res.status(400).json({ message: 'Certificate ID is required' });
        return;
      }
      
      // Get the certificate details
      const certificate = await shareCertificateService.getCertificate(id as string);
      
      if (!certificate.certificate.document_path) {
        res.status(404).json({ message: 'Certificate document not found' });
        return;
      }
      
      const filePath = certificate.certificate.document_path;
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        res.status(404).json({ message: 'Certificate file not found' });
        return;
      }
      
      // Set content type based on format
      const contentType = format === 'png' ? 'image/png' : 'application/pdf';
      
      // Set response headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${certificate.certificate.certificate_number}.${format || 'pdf'}"`);
      
      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error: any) {
      logger.error('Error downloading certificate', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Verify a certificate
   */
  async verifyCertificate(req: Request, res: Response) {
    try {
      const { certificateNumber, verificationCode } = req.body.input;
      const result = await shareCertificateService.verifyCertificate(certificateNumber, verificationCode);
      res.json(result);
    } catch (error: any) {
      logger.error('Error verifying certificate', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Get all certificate batches
   */
  async getBatches(req: Request, res: Response) {
    try {
      const { productId, status } = req.body.input || {};
      const batches = await shareCertificateService.getBatches(productId, status);
      res.json(batches);
    } catch (error: any) {
      logger.error('Error getting certificate batches', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Get certificate batch by ID
   */
  async getBatch(req: Request, res: Response) {
    try {
      const { batchId } = req.body.input;
      const batch = await shareCertificateService.getBatch(batchId);
      res.json(batch);
    } catch (error: any) {
      logger.error('Error getting certificate batch', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Start a new certificate batch process
   */
  async startBatch(req: Request, res: Response) {
    try {
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const result = await shareCertificateService.startBatch(req.body.input, userId);
      res.json(result);
    } catch (error: any) {
      logger.error('Error starting certificate batch', { error });
      res.status(400).json({ message: error.message });
    }
  }
};