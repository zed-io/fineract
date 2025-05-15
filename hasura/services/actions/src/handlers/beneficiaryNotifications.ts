/**
 * Handler for beneficiary notification operations
 * This file handles all GraphQL actions related to beneficiary notifications
 */

import { Request, Response } from 'express';
import { pool } from '../utils/db';
import { handleError } from '../utils/errorHandler';
import { validateJWT } from '../utils/authMiddleware';
import { v4 as uuidv4 } from 'uuid';

// Global action handler for Hasura
export const handler = async (req: Request, res: Response) => {
  const action = req.headers['x-hasura-action'];
  
  try {
    switch (action) {
      case 'getBeneficiaryNotifications':
        return await getBeneficiaryNotifications(req, res);
      case 'getBeneficiaryNotification':
        return await getBeneficiaryNotification(req, res);
      case 'getBeneficiaryNotificationTemplates':
        return await getBeneficiaryNotificationTemplates(req, res);
      case 'getBeneficiaryNotificationTemplate':
        return await getBeneficiaryNotificationTemplate(req, res);
      case 'getBeneficiaryNotificationPreferences':
        return await getBeneficiaryNotificationPreferences(req, res);
      case 'sendBeneficiaryNotification':
        return await sendBeneficiaryNotification(req, res);
      case 'updateBeneficiaryNotificationStatus':
        return await updateBeneficiaryNotificationStatus(req, res);
      case 'updateBeneficiaryNotificationPreference':
        return await updateBeneficiaryNotificationPreference(req, res);
      case 'createBeneficiaryNotificationTemplate':
        return await createBeneficiaryNotificationTemplate(req, res);
      case 'updateBeneficiaryNotificationTemplate':
        return await updateBeneficiaryNotificationTemplate(req, res);
      default:
        res.status(400).json({
          message: `Unknown action: ${action}`
        });
    }
  } catch (error) {
    handleError(res, error);
  }
};

// Handler for getting notifications for a specific beneficiary
export const getBeneficiaryNotifications = async (req: Request, res: Response) => {
  try {
    await validateJWT(req);
    
    const { input } = req.body;
    const { 
      beneficiaryId, 
      savingsAccountId, 
      status, 
      notificationType, 
      eventType, 
      fromDate, 
      toDate,
      limit = 20,
      offset = 0,
      orderBy = 'created_date',
      sortOrder = 'desc'
    } = input;

    // Build the WHERE clause based on input parameters
    const whereConditions = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (beneficiaryId) {
      whereConditions.push(`bn.beneficiary_id = $${paramIndex++}`);
      params.push(beneficiaryId);
    }

    if (savingsAccountId) {
      whereConditions.push(`bn.savings_account_id = $${paramIndex++}`);
      params.push(savingsAccountId);
    }

    if (status) {
      whereConditions.push(`bn.status = $${paramIndex++}`);
      params.push(status);
    }

    if (notificationType) {
      whereConditions.push(`bn.notification_type = $${paramIndex++}`);
      params.push(notificationType);
    }

    if (eventType) {
      whereConditions.push(`bn.event_type = $${paramIndex++}`);
      params.push(eventType);
    }

    if (fromDate) {
      whereConditions.push(`bn.created_date >= $${paramIndex++}`);
      params.push(fromDate);
    }

    if (toDate) {
      whereConditions.push(`bn.created_date <= $${paramIndex++}`);
      params.push(toDate);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // Get total count of matching notifications
    const countQuery = `
      SELECT COUNT(*) 
      FROM savings_beneficiary_notification bn
      ${whereClause}
    `;
    
    const countResult = await pool.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count, 10);

    // Get the paginated notifications
    const query = `
      SELECT 
        bn.id,
        bn.beneficiary_id AS "beneficiaryId",
        bn.savings_account_id AS "savingsAccountId",
        bn.template_id AS "templateId",
        bn.notification_type AS "notificationType",
        bn.recipient,
        bn.subject,
        bn.message,
        bn.status,
        bn.error_message AS "errorMessage",
        bn.event_type AS "eventType",
        bn.triggered_by AS "triggeredBy",
        bn.sent_date AS "sentDate",
        bn.delivery_date AS "deliveryDate",
        bn.created_date AS "createdDate",
        
        -- Template data
        t.id AS "template.id",
        t.template_name AS "template.templateName",
        t.template_code AS "template.templateCode",
        t.subject AS "template.subject",
        t.message_template AS "template.messageTemplate",
        t.template_type AS "template.templateType",
        t.event_type AS "template.eventType",
        t.description AS "template.description",
        t.is_active AS "template.isActive",
        t.created_date AS "template.createdDate",
        
        -- Beneficiary data
        sab.id AS "beneficiary.id",
        sab.name AS "beneficiary.name",
        sab.relationship_type AS "beneficiary.relationshipType",
        sab.percentage_share AS "beneficiary.percentageShare",
        CASE
          WHEN sab.address_line1 IS NOT NULL OR sab.address_line2 IS NOT NULL THEN
            CONCAT_WS(', ', NULLIF(sab.address_line1, ''), NULLIF(sab.address_line2, ''), 
                      NULLIF(sab.city, ''), NULLIF(sab.state, ''), NULLIF(sab.country, ''))
          ELSE NULL
        END AS "beneficiary.address",
        sab.contact_number AS "beneficiary.contactNumber",
        sab.email AS "beneficiary.email",
        sab.document_type AS "beneficiary.identificationType",
        sab.document_identification_number AS "beneficiary.identificationNumber",
        sab.is_active AS "beneficiary.isActive",
        sab.created_date AS "beneficiary.createdDate",
        
        -- User data for triggered_by
        u.username AS "triggeredByUser.username",
        u.email AS "triggeredByUser.email",
        u.display_name AS "triggeredByUser.displayName"
      FROM 
        savings_beneficiary_notification bn
      LEFT JOIN 
        savings_beneficiary_notification_template t ON bn.template_id = t.id
      LEFT JOIN 
        savings_account_beneficiary sab ON bn.beneficiary_id = sab.id
      LEFT JOIN 
        app_user u ON bn.triggered_by = u.id
      ${whereClause}
      ORDER BY bn.${orderBy} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    
    params.push(limit);
    params.push(offset);
    
    const result = await pool.query(query, params);
    
    // Process the nested objects
    const notifications = result.rows.map(row => {
      const notification = {
        id: row.id,
        beneficiaryId: row.beneficiaryId,
        savingsAccountId: row.savingsAccountId,
        templateId: row.templateId,
        notificationType: row.notificationType,
        recipient: row.recipient,
        subject: row.subject,
        message: row.message,
        status: row.status,
        errorMessage: row.errorMessage,
        eventType: row.eventType,
        triggeredBy: row.triggeredBy ? {
          username: row.triggeredByUser?.username,
          email: row.triggeredByUser?.email,
          displayName: row.triggeredByUser?.displayName
        } : null,
        sentDate: row.sentDate,
        deliveryDate: row.deliveryDate,
        createdDate: row.createdDate
      };
      
      // Add template if exists
      if (row['template.id']) {
        notification.template = {
          id: row['template.id'],
          templateName: row['template.templateName'],
          templateCode: row['template.templateCode'],
          subject: row['template.subject'],
          messageTemplate: row['template.messageTemplate'],
          templateType: row['template.templateType'],
          eventType: row['template.eventType'],
          description: row['template.description'],
          isActive: row['template.isActive'],
          createdDate: row['template.createdDate']
        };
      }
      
      // Add beneficiary if exists
      if (row['beneficiary.id']) {
        notification.beneficiary = {
          id: row['beneficiary.id'],
          name: row['beneficiary.name'],
          relationshipType: row['beneficiary.relationshipType'],
          percentageShare: row['beneficiary.percentageShare'],
          address: row['beneficiary.address'],
          contactNumber: row['beneficiary.contactNumber'],
          email: row['beneficiary.email'],
          identificationType: row['beneficiary.identificationType'],
          identificationNumber: row['beneficiary.identificationNumber'],
          isActive: row['beneficiary.isActive'],
          createdDate: row['beneficiary.createdDate']
        };
      }
      
      return notification;
    });

    res.json({
      notifications,
      totalCount
    });
  } catch (error) {
    handleError(res, error);
  }
};

// Handler for getting a single notification by ID
export const getBeneficiaryNotification = async (req: Request, res: Response) => {
  try {
    await validateJWT(req);
    
    const { id } = req.body;
    
    const query = `
      SELECT 
        bn.id,
        bn.beneficiary_id AS "beneficiaryId",
        bn.savings_account_id AS "savingsAccountId",
        bn.template_id AS "templateId",
        bn.notification_type AS "notificationType",
        bn.recipient,
        bn.subject,
        bn.message,
        bn.status,
        bn.error_message AS "errorMessage",
        bn.event_type AS "eventType",
        bn.triggered_by AS "triggeredBy",
        bn.sent_date AS "sentDate",
        bn.delivery_date AS "deliveryDate",
        bn.created_date AS "createdDate",
        
        -- Template data
        t.id AS "template.id",
        t.template_name AS "template.templateName",
        t.template_code AS "template.templateCode",
        t.subject AS "template.subject",
        t.message_template AS "template.messageTemplate",
        t.template_type AS "template.templateType",
        t.event_type AS "template.eventType",
        t.description AS "template.description",
        t.is_active AS "template.isActive",
        t.created_date AS "template.createdDate",
        
        -- Beneficiary data
        sab.id AS "beneficiary.id",
        sab.name AS "beneficiary.name",
        sab.relationship_type AS "beneficiary.relationshipType",
        sab.percentage_share AS "beneficiary.percentageShare",
        CASE
          WHEN sab.address_line1 IS NOT NULL OR sab.address_line2 IS NOT NULL THEN
            CONCAT_WS(', ', NULLIF(sab.address_line1, ''), NULLIF(sab.address_line2, ''), 
                      NULLIF(sab.city, ''), NULLIF(sab.state, ''), NULLIF(sab.country, ''))
          ELSE NULL
        END AS "beneficiary.address",
        sab.contact_number AS "beneficiary.contactNumber",
        sab.email AS "beneficiary.email",
        sab.document_type AS "beneficiary.identificationType",
        sab.document_identification_number AS "beneficiary.identificationNumber",
        sab.is_active AS "beneficiary.isActive",
        sab.created_date AS "beneficiary.createdDate",
        
        -- User data for triggered_by
        u.username AS "triggeredByUser.username",
        u.email AS "triggeredByUser.email",
        u.display_name AS "triggeredByUser.displayName"
      FROM 
        savings_beneficiary_notification bn
      LEFT JOIN 
        savings_beneficiary_notification_template t ON bn.template_id = t.id
      LEFT JOIN 
        savings_account_beneficiary sab ON bn.beneficiary_id = sab.id
      LEFT JOIN 
        app_user u ON bn.triggered_by = u.id
      WHERE 
        bn.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Notification not found'
      });
    }
    
    const row = result.rows[0];
    
    const notification = {
      id: row.id,
      beneficiaryId: row.beneficiaryId,
      savingsAccountId: row.savingsAccountId,
      templateId: row.templateId,
      notificationType: row.notificationType,
      recipient: row.recipient,
      subject: row.subject,
      message: row.message,
      status: row.status,
      errorMessage: row.errorMessage,
      eventType: row.eventType,
      triggeredBy: row.triggeredBy ? {
        username: row.triggeredByUser?.username,
        email: row.triggeredByUser?.email,
        displayName: row.triggeredByUser?.displayName
      } : null,
      sentDate: row.sentDate,
      deliveryDate: row.deliveryDate,
      createdDate: row.createdDate
    };
    
    // Add template if exists
    if (row['template.id']) {
      notification.template = {
        id: row['template.id'],
        templateName: row['template.templateName'],
        templateCode: row['template.templateCode'],
        subject: row['template.subject'],
        messageTemplate: row['template.messageTemplate'],
        templateType: row['template.templateType'],
        eventType: row['template.eventType'],
        description: row['template.description'],
        isActive: row['template.isActive'],
        createdDate: row['template.createdDate']
      };
    }
    
    // Add beneficiary if exists
    if (row['beneficiary.id']) {
      notification.beneficiary = {
        id: row['beneficiary.id'],
        name: row['beneficiary.name'],
        relationshipType: row['beneficiary.relationshipType'],
        percentageShare: row['beneficiary.percentageShare'],
        address: row['beneficiary.address'],
        contactNumber: row['beneficiary.contactNumber'],
        email: row['beneficiary.email'],
        identificationType: row['beneficiary.identificationType'],
        identificationNumber: row['beneficiary.identificationNumber'],
        isActive: row['beneficiary.isActive'],
        createdDate: row['beneficiary.createdDate']
      };
    }
    
    res.json(notification);
  } catch (error) {
    handleError(res, error);
  }
};

// Handler for getting notification templates
export const getBeneficiaryNotificationTemplates = async (req: Request, res: Response) => {
  try {
    await validateJWT(req);
    
    const { input } = req.body;
    const { templateType, eventType, isActive } = input || {};
    
    // Build the WHERE clause based on input parameters
    const whereConditions = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (templateType) {
      whereConditions.push(`template_type = $${paramIndex++}`);
      params.push(templateType);
    }
    
    if (eventType) {
      whereConditions.push(`event_type = $${paramIndex++}`);
      params.push(eventType);
    }
    
    if (isActive !== undefined) {
      whereConditions.push(`is_active = $${paramIndex++}`);
      params.push(isActive);
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';
    
    // Get total count of matching templates
    const countQuery = `
      SELECT COUNT(*) 
      FROM savings_beneficiary_notification_template
      ${whereClause}
    `;
    
    const countResult = await pool.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count, 10);
    
    // Get the templates
    const query = `
      SELECT 
        id,
        template_name AS "templateName",
        template_code AS "templateCode",
        subject,
        message_template AS "messageTemplate",
        template_type AS "templateType",
        event_type AS "eventType",
        description,
        is_active AS "isActive",
        created_date AS "createdDate"
      FROM 
        savings_beneficiary_notification_template
      ${whereClause}
      ORDER BY template_name ASC
    `;
    
    const result = await pool.query(query, params);
    
    res.json({
      templates: result.rows,
      totalCount
    });
  } catch (error) {
    handleError(res, error);
  }
};

// Handler for getting a single notification template by ID
export const getBeneficiaryNotificationTemplate = async (req: Request, res: Response) => {
  try {
    await validateJWT(req);
    
    const { id } = req.body;
    
    const query = `
      SELECT 
        id,
        template_name AS "templateName",
        template_code AS "templateCode",
        subject,
        message_template AS "messageTemplate",
        template_type AS "templateType",
        event_type AS "eventType",
        description,
        is_active AS "isActive",
        created_date AS "createdDate"
      FROM 
        savings_beneficiary_notification_template
      WHERE 
        id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Template not found'
      });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    handleError(res, error);
  }
};

// Handler for getting notification preferences
export const getBeneficiaryNotificationPreferences = async (req: Request, res: Response) => {
  try {
    await validateJWT(req);
    
    const { input } = req.body;
    const { beneficiaryId } = input;
    
    if (!beneficiaryId) {
      return res.status(400).json({
        message: 'Beneficiary ID is required'
      });
    }
    
    // Get total count of preferences
    const countQuery = `
      SELECT COUNT(*) 
      FROM savings_beneficiary_notification_preference
      WHERE beneficiary_id = $1
    `;
    
    const countResult = await pool.query(countQuery, [beneficiaryId]);
    const totalCount = parseInt(countResult.rows[0].count, 10);
    
    // Get the preferences
    const query = `
      SELECT 
        p.id,
        p.beneficiary_id AS "beneficiaryId",
        p.notification_type AS "notificationType",
        p.event_type AS "eventType",
        p.is_enabled AS "isEnabled",
        p.created_date AS "createdDate",
        
        -- Beneficiary data
        sab.id AS "beneficiary.id",
        sab.name AS "beneficiary.name",
        sab.relationship_type AS "beneficiary.relationshipType",
        sab.percentage_share AS "beneficiary.percentageShare",
        CASE
          WHEN sab.address_line1 IS NOT NULL OR sab.address_line2 IS NOT NULL THEN
            CONCAT_WS(', ', NULLIF(sab.address_line1, ''), NULLIF(sab.address_line2, ''), 
                      NULLIF(sab.city, ''), NULLIF(sab.state, ''), NULLIF(sab.country, ''))
          ELSE NULL
        END AS "beneficiary.address",
        sab.contact_number AS "beneficiary.contactNumber",
        sab.email AS "beneficiary.email",
        sab.document_type AS "beneficiary.identificationType",
        sab.document_identification_number AS "beneficiary.identificationNumber",
        sab.is_active AS "beneficiary.isActive",
        sab.created_date AS "beneficiary.createdDate"
      FROM 
        savings_beneficiary_notification_preference p
      JOIN 
        savings_account_beneficiary sab ON p.beneficiary_id = sab.id
      WHERE 
        p.beneficiary_id = $1
      ORDER BY 
        p.notification_type, p.event_type
    `;
    
    const result = await pool.query(query, [beneficiaryId]);
    
    // Process the nested objects
    const preferences = result.rows.map(row => {
      const preference = {
        id: row.id,
        beneficiaryId: row.beneficiaryId,
        notificationType: row.notificationType,
        eventType: row.eventType,
        isEnabled: row.isEnabled,
        createdDate: row.createdDate
      };
      
      // Add beneficiary if exists
      if (row['beneficiary.id']) {
        preference.beneficiary = {
          id: row['beneficiary.id'],
          name: row['beneficiary.name'],
          relationshipType: row['beneficiary.relationshipType'],
          percentageShare: row['beneficiary.percentageShare'],
          address: row['beneficiary.address'],
          contactNumber: row['beneficiary.contactNumber'],
          email: row['beneficiary.email'],
          identificationType: row['beneficiary.identificationType'],
          identificationNumber: row['beneficiary.identificationNumber'],
          isActive: row['beneficiary.isActive'],
          createdDate: row['beneficiary.createdDate']
        };
      }
      
      return preference;
    });
    
    res.json({
      preferences,
      totalCount
    });
  } catch (error) {
    handleError(res, error);
  }
};

// Handler for sending a notification
export const sendBeneficiaryNotification = async (req: Request, res: Response) => {
  try {
    const user = await validateJWT(req);
    
    const { input } = req.body;
    const { beneficiaryId, templateCode } = input;
    
    if (!beneficiaryId || !templateCode) {
      return res.status(400).json({
        success: false,
        message: 'Beneficiary ID and template code are required'
      });
    }
    
    // Call the database function to send the notification
    const query = `
      SELECT send_manual_beneficiary_notification($1, $2, $3) AS notification_id
    `;
    
    const result = await pool.query(query, [beneficiaryId, templateCode, user.id]);
    
    if (!result.rows[0].notification_id) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send notification'
      });
    }
    
    res.json({
      success: true,
      message: 'Notification sent successfully',
      notificationId: result.rows[0].notification_id
    });
  } catch (error) {
    handleError(res, error, 'Failed to send notification');
  }
};

// Handler for updating notification status
export const updateBeneficiaryNotificationStatus = async (req: Request, res: Response) => {
  try {
    await validateJWT(req);
    
    const { input } = req.body;
    const { notificationId, status, errorMessage } = input;
    
    if (!notificationId || !status) {
      return res.status(400).json({
        success: false,
        message: 'Notification ID and status are required'
      });
    }
    
    // Update the notification status
    const query = `
      UPDATE savings_beneficiary_notification
      SET 
        status = $2,
        error_message = $3,
        sent_date = CASE WHEN $2 = 'sent' THEN NOW() ELSE sent_date END,
        delivery_date = CASE WHEN $2 = 'delivered' THEN NOW() ELSE delivery_date END,
        last_modified_date = NOW()
      WHERE 
        id = $1
      RETURNING id
    `;
    
    const result = await pool.query(query, [notificationId, status, errorMessage || null]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Notification status updated successfully'
    });
  } catch (error) {
    handleError(res, error, 'Failed to update notification status');
  }
};

// Handler for updating notification preferences
export const updateBeneficiaryNotificationPreference = async (req: Request, res: Response) => {
  try {
    const user = await validateJWT(req);
    
    const { input } = req.body;
    const { beneficiaryId, notificationType, eventType, isEnabled } = input;
    
    if (!beneficiaryId || !notificationType || !eventType || isEnabled === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Beneficiary ID, notification type, event type, and isEnabled are required'
      });
    }
    
    // Check if the preference exists
    const checkQuery = `
      SELECT id 
      FROM savings_beneficiary_notification_preference
      WHERE 
        beneficiary_id = $1 AND 
        notification_type = $2 AND 
        event_type = $3
    `;
    
    const checkResult = await pool.query(checkQuery, [beneficiaryId, notificationType, eventType]);
    
    let preferenceId;
    
    if (checkResult.rows.length > 0) {
      // Update existing preference
      const updateQuery = `
        UPDATE savings_beneficiary_notification_preference
        SET 
          is_enabled = $4,
          last_modified_date = NOW(),
          last_modified_by = $5
        WHERE 
          id = $6
        RETURNING 
          id,
          beneficiary_id AS "beneficiaryId",
          notification_type AS "notificationType",
          event_type AS "eventType",
          is_enabled AS "isEnabled",
          created_date AS "createdDate"
      `;
      
      const updateResult = await pool.query(updateQuery, [
        isEnabled, 
        user.id,
        checkResult.rows[0].id
      ]);
      
      preferenceId = updateResult.rows[0].id;
    } else {
      // Create new preference
      const insertQuery = `
        INSERT INTO savings_beneficiary_notification_preference (
          id,
          beneficiary_id,
          notification_type,
          event_type,
          is_enabled,
          created_date,
          created_by
        ) VALUES (
          $1, $2, $3, $4, $5, NOW(), $6
        )
        RETURNING 
          id,
          beneficiary_id AS "beneficiaryId",
          notification_type AS "notificationType",
          event_type AS "eventType",
          is_enabled AS "isEnabled",
          created_date AS "createdDate"
      `;
      
      const newId = uuidv4();
      
      const insertResult = await pool.query(insertQuery, [
        newId,
        beneficiaryId,
        notificationType,
        eventType,
        isEnabled,
        user.id
      ]);
      
      preferenceId = insertResult.rows[0].id;
    }
    
    // Get the updated preference with beneficiary info
    const getQuery = `
      SELECT 
        p.id,
        p.beneficiary_id AS "beneficiaryId",
        p.notification_type AS "notificationType",
        p.event_type AS "eventType",
        p.is_enabled AS "isEnabled",
        p.created_date AS "createdDate",
        
        -- Beneficiary data
        sab.id AS "beneficiary.id",
        sab.name AS "beneficiary.name",
        sab.relationship_type AS "beneficiary.relationshipType",
        sab.percentage_share AS "beneficiary.percentageShare",
        CASE
          WHEN sab.address_line1 IS NOT NULL OR sab.address_line2 IS NOT NULL THEN
            CONCAT_WS(', ', NULLIF(sab.address_line1, ''), NULLIF(sab.address_line2, ''), 
                      NULLIF(sab.city, ''), NULLIF(sab.state, ''), NULLIF(sab.country, ''))
          ELSE NULL
        END AS "beneficiary.address",
        sab.contact_number AS "beneficiary.contactNumber",
        sab.email AS "beneficiary.email",
        sab.document_type AS "beneficiary.identificationType",
        sab.document_identification_number AS "beneficiary.identificationNumber",
        sab.is_active AS "beneficiary.isActive",
        sab.created_date AS "beneficiary.createdDate"
      FROM 
        savings_beneficiary_notification_preference p
      JOIN 
        savings_account_beneficiary sab ON p.beneficiary_id = sab.id
      WHERE 
        p.id = $1
    `;
    
    const getResult = await pool.query(getQuery, [preferenceId]);
    
    if (getResult.rows.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve updated preference'
      });
    }
    
    const row = getResult.rows[0];
    
    const preference = {
      id: row.id,
      beneficiaryId: row.beneficiaryId,
      notificationType: row.notificationType,
      eventType: row.eventType,
      isEnabled: row.isEnabled,
      createdDate: row.createdDate
    };
    
    // Add beneficiary if exists
    if (row['beneficiary.id']) {
      preference.beneficiary = {
        id: row['beneficiary.id'],
        name: row['beneficiary.name'],
        relationshipType: row['beneficiary.relationshipType'],
        percentageShare: row['beneficiary.percentageShare'],
        address: row['beneficiary.address'],
        contactNumber: row['beneficiary.contactNumber'],
        email: row['beneficiary.email'],
        identificationType: row['beneficiary.identificationType'],
        identificationNumber: row['beneficiary.identificationNumber'],
        isActive: row['beneficiary.isActive'],
        createdDate: row['beneficiary.createdDate']
      };
    }
    
    res.json({
      success: true,
      message: 'Notification preference updated successfully',
      preference
    });
  } catch (error) {
    handleError(res, error, 'Failed to update notification preference');
  }
};

// Handler for creating a notification template
export const createBeneficiaryNotificationTemplate = async (req: Request, res: Response) => {
  try {
    const user = await validateJWT(req);
    
    const { input } = req.body;
    const { 
      templateName, 
      templateCode, 
      subject, 
      messageTemplate, 
      templateType, 
      eventType,
      description,
      isActive 
    } = input;
    
    // Validate required fields
    if (!templateName || !templateCode || !messageTemplate || !templateType || !eventType) {
      return res.status(400).json({
        success: false,
        message: 'Template name, code, message, type, and event type are required'
      });
    }
    
    // Check if template code already exists
    const checkQuery = `
      SELECT id FROM savings_beneficiary_notification_template
      WHERE template_code = $1
    `;
    
    const checkResult = await pool.query(checkQuery, [templateCode]);
    
    if (checkResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Template code already exists'
      });
    }
    
    // Create the template
    const query = `
      INSERT INTO savings_beneficiary_notification_template (
        id,
        template_name,
        template_code,
        subject,
        message_template,
        template_type,
        event_type,
        description,
        is_active,
        created_date,
        created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10
      )
      RETURNING 
        id,
        template_name AS "templateName",
        template_code AS "templateCode",
        subject,
        message_template AS "messageTemplate",
        template_type AS "templateType",
        event_type AS "eventType",
        description,
        is_active AS "isActive",
        created_date AS "createdDate"
    `;
    
    const templateId = uuidv4();
    
    const result = await pool.query(query, [
      templateId,
      templateName,
      templateCode,
      subject,
      messageTemplate,
      templateType,
      eventType,
      description,
      isActive === undefined ? true : isActive,
      user.id
    ]);
    
    res.json({
      success: true,
      message: 'Template created successfully',
      template: result.rows[0]
    });
  } catch (error) {
    handleError(res, error, 'Failed to create notification template');
  }
};

// Handler for updating a notification template
export const updateBeneficiaryNotificationTemplate = async (req: Request, res: Response) => {
  try {
    const user = await validateJWT(req);
    
    const { input } = req.body;
    const { 
      templateId, 
      templateName, 
      subject, 
      messageTemplate, 
      description,
      isActive 
    } = input;
    
    if (!templateId) {
      return res.status(400).json({
        success: false,
        message: 'Template ID is required'
      });
    }
    
    // Build the SET clause based on provided fields
    const updates = [];
    const params = [templateId];
    let paramIndex = 2;
    
    if (templateName !== undefined) {
      updates.push(`template_name = $${paramIndex++}`);
      params.push(templateName);
    }
    
    if (subject !== undefined) {
      updates.push(`subject = $${paramIndex++}`);
      params.push(subject);
    }
    
    if (messageTemplate !== undefined) {
      updates.push(`message_template = $${paramIndex++}`);
      params.push(messageTemplate);
    }
    
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(description);
    }
    
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(isActive);
    }
    
    // Add last modified fields
    updates.push(`last_modified_date = NOW()`);
    updates.push(`last_modified_by = $${paramIndex++}`);
    params.push(user.id);
    
    if (updates.length === 2) {  // Only the last_modified fields
      return res.status(400).json({
        success: false,
        message: 'At least one field to update must be provided'
      });
    }
    
    // Update the template
    const query = `
      UPDATE savings_beneficiary_notification_template
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING 
        id,
        template_name AS "templateName",
        template_code AS "templateCode",
        subject,
        message_template AS "messageTemplate",
        template_type AS "templateType",
        event_type AS "eventType",
        description,
        is_active AS "isActive",
        created_date AS "createdDate"
    `;
    
    const result = await pool.query(query, params);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Template updated successfully',
      template: result.rows[0]
    });
  } catch (error) {
    handleError(res, error, 'Failed to update notification template');
  }
};

// Export handler functions
export default {
  getBeneficiaryNotifications,
  getBeneficiaryNotification,
  getBeneficiaryNotificationTemplates,
  getBeneficiaryNotificationTemplate,
  getBeneficiaryNotificationPreferences,
  sendBeneficiaryNotification,
  updateBeneficiaryNotificationStatus,
  updateBeneficiaryNotificationPreference,
  createBeneficiaryNotificationTemplate,
  updateBeneficiaryNotificationTemplate
};