/**
 * Accounting API routes for Fineract Hasura Actions
 */

import { Router } from 'express';
import * as accountHandler from '../handlers/accounting/accountHandler';
import * as closureHandler from '../handlers/accounting/closureHandler';
import * as ruleHandler from '../handlers/accounting/ruleHandler';
import * as paymentTypeHandler from '../handlers/accounting/paymentTypeHandler';
import * as templateHandler from '../handlers/accounting/templateHandler';

export const accountingRoutes = Router();

// GL Account routes
accountingRoutes.post('/gl-account/create', accountHandler.createGLAccount);
accountingRoutes.post('/gl-account/update', accountHandler.updateGLAccount);
accountingRoutes.post('/gl-account/delete', accountHandler.deleteGLAccount);
accountingRoutes.post('/gl-account/get', accountHandler.getGLAccount);
accountingRoutes.post('/gl-accounts', accountHandler.getGLAccounts);
accountingRoutes.post('/gl-accounts-tree', accountHandler.getGLAccountsTree);

// GL Closure routes
accountingRoutes.post('/gl-closure/create', closureHandler.createGLClosure);
accountingRoutes.post('/gl-closure/delete', closureHandler.deleteGLClosure);
accountingRoutes.post('/gl-closure/get', closureHandler.getGLClosure);
accountingRoutes.post('/gl-closures', closureHandler.getGLClosures);

// Accounting Rule routes
accountingRoutes.post('/rule/create', ruleHandler.createAccountingRule);
accountingRoutes.post('/rule/update', ruleHandler.updateAccountingRule);
accountingRoutes.post('/rule/delete', ruleHandler.deleteAccountingRule);
accountingRoutes.post('/rule/get', ruleHandler.getAccountingRule);
accountingRoutes.post('/rules', ruleHandler.getAccountingRules);

// Payment Type routes
accountingRoutes.post('/payment-type/create', paymentTypeHandler.createPaymentType);
accountingRoutes.post('/payment-type/update', paymentTypeHandler.updatePaymentType);
accountingRoutes.post('/payment-type/delete', paymentTypeHandler.deletePaymentType);
accountingRoutes.post('/payment-type/get', paymentTypeHandler.getPaymentType);
accountingRoutes.post('/payment-types', paymentTypeHandler.getPaymentTypes);

// Template routes
accountingRoutes.post('/template', templateHandler.getAccountingTemplate);