/**
 * Fixed Deposit API routes for Fineract Hasura Actions
 */

import { Router } from 'express';
import { fixedDepositHandlers } from '../handlers/fixedDeposit';
import { 
  getFixedDepositMaturityDetails, 
  getFixedDepositMaturityHistory, 
  processFixedDepositMaturity, 
  updateFixedDepositMaturityInstructions 
} from '../handlers/fixedDepositMaturity';
import {
  getFixedDepositPrematureClosureDetails,
  prematureCloseFixedDepositAccount
} from '../handlers/fixedDepositPrematureClosure';

export const fixedDepositRoutes = Router();

// Fixed Deposit Product routes
fixedDepositRoutes.post('/product/create', fixedDepositHandlers.createProduct);
fixedDepositRoutes.post('/product/get', fixedDepositHandlers.getProduct);
fixedDepositRoutes.post('/products', fixedDepositHandlers.getProducts);

// Fixed Deposit Account routes
fixedDepositRoutes.post('/account/create', fixedDepositHandlers.createAccount);
fixedDepositRoutes.post('/account/get', fixedDepositHandlers.getAccount);
fixedDepositRoutes.post('/account/approve', fixedDepositHandlers.approveAccount);
fixedDepositRoutes.post('/account/activate', fixedDepositHandlers.activateAccount);
fixedDepositRoutes.post('/account/premature-close', fixedDepositHandlers.prematureClose);
fixedDepositRoutes.post('/account/update-maturity-instructions', fixedDepositHandlers.updateMaturityInstructions);

// Client fixed deposit accounts
fixedDepositRoutes.post('/client/accounts', fixedDepositHandlers.getClientAccounts);

// Fixed Deposit template
fixedDepositRoutes.post('/template', fixedDepositHandlers.getTemplate);

// Maturity Processing routes
fixedDepositRoutes.post('/maturity/details', getFixedDepositMaturityDetails);
fixedDepositRoutes.post('/maturity/history', getFixedDepositMaturityHistory);
fixedDepositRoutes.post('/maturity/process', processFixedDepositMaturity);
fixedDepositRoutes.post('/maturity/instructions', updateFixedDepositMaturityInstructions);

// Premature Closure routes
fixedDepositRoutes.post('/premature-closure/details', getFixedDepositPrematureClosureDetails);
fixedDepositRoutes.post('/premature-closure/process', prematureCloseFixedDepositAccount);