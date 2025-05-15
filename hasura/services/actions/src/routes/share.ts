/**
 * Share Account API routes for Fineract Hasura Actions
 */

import { Router } from 'express';
import { shareHandlers } from '../handlers/share';
import { shareCertificateHandlers } from '../handlers/shareCertificate';

export const shareRoutes = Router();

// Share Product routes
shareRoutes.post('/product/create', shareHandlers.createProduct);
shareRoutes.post('/product/get', shareHandlers.getProduct);
shareRoutes.post('/products', shareHandlers.getProducts);

// Share Account routes
shareRoutes.post('/account/create', shareHandlers.createAccount);
shareRoutes.post('/account/get', shareHandlers.getAccount);
shareRoutes.post('/account/approve', shareHandlers.approveAccount);
shareRoutes.post('/account/reject', shareHandlers.rejectAccount);
shareRoutes.post('/account/activate', shareHandlers.activateAccount);
shareRoutes.post('/account/close', shareHandlers.closeAccount);

// Share Purchase routes
shareRoutes.post('/purchase/submit', shareHandlers.submitPurchaseRequest);
shareRoutes.post('/purchase/approve', shareHandlers.approvePurchaseRequest);
shareRoutes.post('/purchase/reject', shareHandlers.rejectPurchaseRequest);
shareRoutes.post('/redeem', shareHandlers.redeemShares);

// Dividend routes
shareRoutes.post('/dividend/declare', shareHandlers.declareProductDividend);
shareRoutes.post('/dividend/process', shareHandlers.processDividend);

// Client/Group share accounts
shareRoutes.post('/client/accounts', shareHandlers.getClientAccounts);
shareRoutes.post('/group/accounts', shareHandlers.getGroupAccounts);

// Template
shareRoutes.post('/template', shareHandlers.getTemplate);

// Share Certificate Template routes
shareRoutes.post('/certificate/templates', shareCertificateHandlers.getTemplates);
shareRoutes.post('/certificate/template/get', shareCertificateHandlers.getTemplate);
shareRoutes.post('/certificate/template/create', shareCertificateHandlers.createTemplate);
shareRoutes.post('/certificate/template/update', shareCertificateHandlers.updateTemplate);

// Share Certificate Series routes
shareRoutes.post('/certificate/series/list', shareCertificateHandlers.getSeriesList);
shareRoutes.post('/certificate/series/create', shareCertificateHandlers.createSeries);
shareRoutes.post('/certificate/series/update', shareCertificateHandlers.updateSeries);

// Share Certificate routes
shareRoutes.post('/certificate/get', shareCertificateHandlers.getCertificate);
shareRoutes.post('/certificates', shareCertificateHandlers.getCertificates);
shareRoutes.post('/certificate/generate', shareCertificateHandlers.generateCertificate);
shareRoutes.post('/certificate/revoke', shareCertificateHandlers.revokeCertificate);
shareRoutes.post('/certificate/regenerate', shareCertificateHandlers.regenerateCertificate);
shareRoutes.post('/certificate/download', shareCertificateHandlers.downloadCertificate);
shareRoutes.post('/certificate/verify', shareCertificateHandlers.verifyCertificate);

// Share Certificate Batch routes
shareRoutes.post('/certificate/batches', shareCertificateHandlers.getBatches);
shareRoutes.post('/certificate/batch/get', shareCertificateHandlers.getBatch);
shareRoutes.post('/certificate/batch/start', shareCertificateHandlers.startBatch);