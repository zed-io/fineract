import { Router } from 'express';
import {
  createSavingsAccountHold,
  releaseSavingsAccountHold,
  updateSavingsAccountHold,
  getSavingsAccountHolds
} from '../handlers/savingsHolds';

export const savingsHoldsRoutes = Router();

// Register routes
savingsHoldsRoutes.post('/create', createSavingsAccountHold);
savingsHoldsRoutes.post('/release', releaseSavingsAccountHold);
savingsHoldsRoutes.post('/update', updateSavingsAccountHold);
savingsHoldsRoutes.post('/get', getSavingsAccountHolds);