import express from 'express';
import beneficiaryNotificationHandlers from '../handlers/beneficiaryNotifications';

const router = express.Router();

// Query routes
router.post('/notifications', beneficiaryNotificationHandlers.getBeneficiaryNotifications);
router.post('/notification', beneficiaryNotificationHandlers.getBeneficiaryNotification);
router.post('/templates', beneficiaryNotificationHandlers.getBeneficiaryNotificationTemplates);
router.post('/template', beneficiaryNotificationHandlers.getBeneficiaryNotificationTemplate);
router.post('/preferences', beneficiaryNotificationHandlers.getBeneficiaryNotificationPreferences);

// Mutation routes
router.post('/send', beneficiaryNotificationHandlers.sendBeneficiaryNotification);
router.post('/status/update', beneficiaryNotificationHandlers.updateBeneficiaryNotificationStatus);
router.post('/preference/update', beneficiaryNotificationHandlers.updateBeneficiaryNotificationPreference);
router.post('/template/create', beneficiaryNotificationHandlers.createBeneficiaryNotificationTemplate);
router.post('/template/update', beneficiaryNotificationHandlers.updateBeneficiaryNotificationTemplate);

export const beneficiaryNotificationRoutes = router;