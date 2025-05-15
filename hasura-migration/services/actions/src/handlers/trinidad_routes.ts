import express from 'express';
import { trinidadHandlers } from './trinidad_digital_banking';

const router = express.Router();

// Digital onboarding
router.post('/digitalOnboarding', trinidadHandlers.digitalOnboarding);
router.post('/uploadKycDocument', trinidadHandlers.uploadKycDocument);

// Loan applications
router.post('/submitDigitalLoanApplication', trinidadHandlers.submitDigitalLoanApplication);

// Mobile banking
router.post('/setupMobileBankingProfile', trinidadHandlers.setupMobileBankingProfile);

// Add more routes as handlers are implemented
// router.post('/setupSecurityQuestions', trinidadHandlers.setupSecurityQuestions);
// router.post('/linkDigitalWallet', trinidadHandlers.linkDigitalWallet);
// router.post('/processDigitalLoanRepayment', trinidadHandlers.processDigitalLoanRepayment);
// router.post('/setupMfaAuthentication', trinidadHandlers.setupMfaAuthentication);
// router.get('/getSecurityQuestions', trinidadHandlers.getSecurityQuestions);
// router.get('/getLinkedDigitalWallets', trinidadHandlers.getLinkedDigitalWallets);
// router.get('/getClientVerificationStatus', trinidadHandlers.getClientVerificationStatus);

export const trinidadRoutes = router;