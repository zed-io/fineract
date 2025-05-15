import express from 'express';
import { LoanDecisionHandler } from '../handlers/loanDecision';

// Create router instance
const loanDecisionRoutes = express.Router();

// Initialize handler
const loanDecisionHandlers = new LoanDecisionHandler();

// Route definitions for loan decisioning
loanDecisionRoutes.post('/assess', loanDecisionHandlers.assessLoanApplication);
loanDecisionRoutes.post('/decide', loanDecisionHandlers.makeLoanDecision);
loanDecisionRoutes.post('/override', loanDecisionHandlers.overrideLoanDecision);
loanDecisionRoutes.get('/history', loanDecisionHandlers.getLoanDecisionHistory);
loanDecisionRoutes.post('/evaluate-ruleset', loanDecisionHandlers.evaluateRuleset);

export { loanDecisionRoutes };