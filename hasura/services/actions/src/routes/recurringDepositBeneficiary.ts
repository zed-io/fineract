import express from 'express';
import * as recurringDepositBeneficiaryHandlers from '../handlers/recurringDepositBeneficiary';

const router = express.Router();

// Query routes
router.post('/list', recurringDepositBeneficiaryHandlers.getRecurringDepositBeneficiaries);
router.post('/get', recurringDepositBeneficiaryHandlers.getRecurringDepositBeneficiary);
router.post('/notifications/list', recurringDepositBeneficiaryHandlers.getRecurringDepositBeneficiaryNotifications);
router.post('/notifications/preferences', recurringDepositBeneficiaryHandlers.getRecurringDepositBeneficiaryNotificationPreferences);

// Mutation routes
router.post('/add', recurringDepositBeneficiaryHandlers.addRecurringDepositBeneficiary);
router.post('/update', recurringDepositBeneficiaryHandlers.updateRecurringDepositBeneficiary);
router.post('/verify', recurringDepositBeneficiaryHandlers.verifyRecurringDepositBeneficiary);
router.post('/remove', recurringDepositBeneficiaryHandlers.removeRecurringDepositBeneficiary);
router.post('/notifications/send', recurringDepositBeneficiaryHandlers.sendRecurringDepositBeneficiaryNotification);
router.post('/notifications/update-preference', recurringDepositBeneficiaryHandlers.updateRecurringDepositBeneficiaryNotificationPreference);

export const recurringDepositBeneficiaryRoutes = router;