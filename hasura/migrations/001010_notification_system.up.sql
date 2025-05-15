-- Migration file for Unified Notification System
-- This creates a centralized notification system for all modules

-- Set search path to the tenant schema
SET search_path TO fineract_default;

-- Create notification types enum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE notification_type AS ENUM (
            'email',
            'sms',
            'push',
            'in_app',
            'websocket'
        );
    END IF;
END $$;

-- Create notification priority enum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_priority') THEN
        CREATE TYPE notification_priority AS ENUM (
            'low',
            'medium',
            'high',
            'critical'
        );
    END IF;
END $$;

-- Create notification status enum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_status') THEN
        CREATE TYPE notification_status AS ENUM (
            'pending',
            'sent',
            'delivered',
            'read',
            'failed'
        );
    END IF;
END $$;

-- Create table for notification templates
CREATE TABLE IF NOT EXISTS notification_template (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    subject VARCHAR(200),
    message_template TEXT NOT NULL,
    applicable_types notification_type[] NOT NULL,
    module VARCHAR(50) NOT NULL, -- 'loan', 'savings', 'client', 'system', etc.
    event_type VARCHAR(50) NOT NULL, -- 'due', 'overdue', 'approval', etc.
    description TEXT,
    placeholders JSONB, -- Documentation for placeholders that can be used in the template
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_date TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Create table for notifications
CREATE TABLE IF NOT EXISTS notification (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID NOT NULL, -- Usually client_id or user_id
    recipient_type VARCHAR(50) NOT NULL, -- 'client', 'staff', 'group'
    notification_type notification_type NOT NULL,
    template_id UUID REFERENCES notification_template(id),
    subject VARCHAR(200),
    message TEXT NOT NULL,
    data JSONB, -- Additional data related to the notification
    priority notification_priority NOT NULL DEFAULT 'medium',
    status notification_status NOT NULL DEFAULT 'pending',
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(50),
    external_id VARCHAR(100), -- Used for tracking in external systems
    error_message TEXT,
    module VARCHAR(50) NOT NULL, -- 'loan', 'savings', 'client', 'system', etc.
    entity_type VARCHAR(50), -- Specific entity type (e.g., 'loan', 'savings_account')
    entity_id UUID, -- Specific entity ID
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_date TIMESTAMP,
    scheduled_date TIMESTAMP, -- For future notifications
    expiry_date TIMESTAMP, -- When the notification expires/should be archived
    sent_date TIMESTAMP,
    delivery_date TIMESTAMP,
    triggered_by UUID,
    created_date TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Create table for user notification preferences
CREATE TABLE IF NOT EXISTS notification_preference (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    notification_type notification_type NOT NULL,
    module VARCHAR(50) NOT NULL, -- 'loan', 'savings', 'client', 'system', etc.
    event_type VARCHAR(50) NOT NULL, -- 'due', 'overdue', 'approval', etc.
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_date TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID,
    UNIQUE(user_id, notification_type, module, event_type)
);

-- Create table for user notification channels
CREATE TABLE IF NOT EXISTS notification_user_channel (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    channel_type notification_type NOT NULL,
    channel_value VARCHAR(255) NOT NULL, -- email address, phone number, device token, etc.
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    verification_token VARCHAR(100),
    verification_expiry TIMESTAMP,
    created_date TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID,
    UNIQUE(user_id, channel_type, channel_value)
);

-- Create table for WebSocket connections
CREATE TABLE IF NOT EXISTS notification_websocket_connection (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    connection_id VARCHAR(100) NOT NULL UNIQUE,
    connection_time TIMESTAMP NOT NULL DEFAULT NOW(),
    last_activity_time TIMESTAMP NOT NULL DEFAULT NOW(),
    user_agent TEXT,
    ip_address VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE(user_id, connection_id)
);

-- Create table for notification topics for pub/sub
CREATE TABLE IF NOT EXISTS notification_topic (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_date TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID
);

-- Create table for user topic subscriptions
CREATE TABLE IF NOT EXISTS notification_subscription (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    topic_id UUID NOT NULL REFERENCES notification_topic(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_date TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    last_modified_date TIMESTAMP,
    last_modified_by UUID,
    UNIQUE(user_id, topic_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notification_recipient_id ON notification(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notification_status ON notification(status);
CREATE INDEX IF NOT EXISTS idx_notification_read ON notification(is_read);
CREATE INDEX IF NOT EXISTS idx_notification_module ON notification(module);
CREATE INDEX IF NOT EXISTS idx_notification_entity ON notification(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notification_created_date ON notification(created_date);
CREATE INDEX IF NOT EXISTS idx_notification_pref_user_id ON notification_preference(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_channel_user_id ON notification_user_channel(user_id);
CREATE INDEX IF NOT EXISTS idx_websocket_connection_user_id ON notification_websocket_connection(user_id);
CREATE INDEX IF NOT EXISTS idx_websocket_connection_active ON notification_websocket_connection(is_active);
CREATE INDEX IF NOT EXISTS idx_notification_subscription_user_id ON notification_subscription(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_subscription_topic_id ON notification_subscription(topic_id);

-- Create a function for sending notifications
CREATE OR REPLACE FUNCTION send_notification(
    p_recipient_id UUID,
    p_recipient_type VARCHAR(50),
    p_notification_type notification_type,
    p_template_code VARCHAR(50),
    p_data JSONB,
    p_module VARCHAR(50),
    p_entity_type VARCHAR(50) DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL,
    p_priority notification_priority DEFAULT 'medium',
    p_scheduled_date TIMESTAMP DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_template_id UUID;
    v_subject VARCHAR(200);
    v_message_template TEXT;
    v_message TEXT;
    v_applicable_types notification_type[];
    v_recipient_email VARCHAR(255);
    v_recipient_phone VARCHAR(50);
    v_notification_id UUID;
    v_notification_enabled BOOLEAN;
BEGIN
    -- Get template details
    SELECT 
        id, subject, message_template, applicable_types
    INTO 
        v_template_id, v_subject, v_message_template, v_applicable_types
    FROM 
        notification_template
    WHERE 
        code = p_template_code
        AND is_active = true;
        
    IF v_template_id IS NULL THEN
        RAISE EXCEPTION 'Notification template with code % not found or not active', p_template_code;
    END IF;
    
    -- Check if notification type is applicable for this template
    IF NOT (p_notification_type = ANY(v_applicable_types)) THEN
        RAISE EXCEPTION 'Notification type % is not applicable for template %', p_notification_type, p_template_code;
    END IF;
    
    -- Check if notification is enabled for this user
    IF p_recipient_type = 'staff' THEN
        SELECT is_enabled INTO v_notification_enabled
        FROM notification_preference
        WHERE 
            user_id = p_recipient_id 
            AND notification_type = p_notification_type 
            AND module = p_module
            AND event_type = (SELECT event_type FROM notification_template WHERE id = v_template_id)
        LIMIT 1;
        
        -- If no preference is set, default to enabled
        IF v_notification_enabled IS NULL THEN
            v_notification_enabled := TRUE;
        END IF;
        
        -- If notification is disabled, do not send
        IF NOT v_notification_enabled THEN
            RAISE EXCEPTION 'Notification is disabled for this user and event type';
        END IF;
        
        -- Get contact information for staff
        IF p_notification_type = 'email' THEN
            SELECT channel_value INTO v_recipient_email
            FROM notification_user_channel
            WHERE 
                user_id = p_recipient_id 
                AND channel_type = 'email'
                AND is_primary = true
                AND is_verified = true
            LIMIT 1;
        ELSIF p_notification_type = 'sms' THEN
            SELECT channel_value INTO v_recipient_phone
            FROM notification_user_channel
            WHERE 
                user_id = p_recipient_id 
                AND channel_type = 'sms'
                AND is_primary = true
                AND is_verified = true
            LIMIT 1;
        END IF;
    ELSIF p_recipient_type = 'client' THEN
        -- Get contact information for client
        -- In a real implementation, this would query the client table
        SELECT email INTO v_recipient_email
        FROM client
        WHERE id = p_recipient_id;
        
        SELECT mobile_no INTO v_recipient_phone
        FROM client
        WHERE id = p_recipient_id;
    END IF;
    
    -- Process template with data
    -- In a real implementation, this would use a template engine
    -- For now, we'll just use the template as is
    v_message := v_message_template;
    
    -- Create notification record
    INSERT INTO notification (
        id,
        recipient_id,
        recipient_type,
        notification_type,
        template_id,
        subject,
        message,
        data,
        priority,
        status,
        recipient_email,
        recipient_phone,
        module,
        entity_type,
        entity_id,
        scheduled_date,
        triggered_by,
        created_date,
        created_by
    ) VALUES (
        uuid_generate_v4(),
        p_recipient_id,
        p_recipient_type,
        p_notification_type,
        v_template_id,
        v_subject,
        v_message,
        p_data,
        p_priority,
        CASE 
            WHEN p_scheduled_date IS NOT NULL AND p_scheduled_date > NOW() THEN 'pending'
            ELSE 'pending'
        END,
        v_recipient_email,
        v_recipient_phone,
        p_module,
        p_entity_type,
        p_entity_id,
        p_scheduled_date,
        p_user_id,
        NOW(),
        p_user_id
    ) RETURNING id INTO v_notification_id;
    
    -- If this is a WebSocket notification, immediately notify connected users
    IF p_notification_type = 'websocket' OR p_notification_type = 'in_app' THEN
        -- In a real implementation, this would trigger a notification to the WebSocket server
        -- For now, just return the ID
        NULL;
    END IF;
    
    RETURN v_notification_id;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error
        RAISE;
END;
$$ LANGUAGE plpgsql;

-- Create function to mark a notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(
    p_notification_id UUID,
    p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_success BOOLEAN;
BEGIN
    UPDATE notification
    SET 
        is_read = TRUE,
        read_date = NOW(),
        last_modified_date = NOW(),
        last_modified_by = p_user_id
    WHERE 
        id = p_notification_id
        AND recipient_id = p_user_id
    RETURNING TRUE INTO v_success;
    
    RETURN COALESCE(v_success, FALSE);
END;
$$ LANGUAGE plpgsql;

-- Create function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read(
    p_user_id UUID,
    p_module VARCHAR(50) DEFAULT NULL,
    p_entity_type VARCHAR(50) DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    WITH updated_rows AS (
        UPDATE notification
        SET 
            is_read = TRUE,
            read_date = NOW(),
            last_modified_date = NOW(),
            last_modified_by = p_user_id
        WHERE 
            recipient_id = p_user_id
            AND is_read = FALSE
            AND (p_module IS NULL OR module = p_module)
            AND (p_entity_type IS NULL OR entity_type = p_entity_type)
            AND (p_entity_id IS NULL OR entity_id = p_entity_id)
        RETURNING id
    )
    SELECT COUNT(*) INTO v_count FROM updated_rows;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Insert initial notification topics
INSERT INTO notification_topic (name, description, is_public, created_date)
VALUES 
    ('system_announcements', 'System-wide announcements from administrators', true, NOW()),
    ('maintenance_alerts', 'System maintenance notifications', true, NOW()),
    ('feature_updates', 'New feature announcements', true, NOW()),
    ('loan_updates', 'Updates related to loans', true, NOW()),
    ('savings_updates', 'Updates related to savings accounts', true, NOW()),
    ('client_updates', 'Updates related to client information', true, NOW());

-- Add notification job configuration
INSERT INTO job_config (
    job_type, 
    enabled, 
    cron_expression, 
    execution_interval, 
    priority, 
    max_retries, 
    timeout_seconds, 
    is_system_job, 
    concurrency_limit, 
    description, 
    parameters
) VALUES (
    'notification_processing', 
    true, 
    '*/1 * * * *', 
    'custom', 
    'high', 
    3, 
    300, 
    true, 
    2, 
    'Process pending notifications (email, SMS, push)',
    jsonb_build_object(
        'batch_size', 100,
        'max_retries', 3,
        'retry_interval_minutes', 5,
        'notification_types', ARRAY['email', 'sms', 'push']::text[]
    )
);

-- Add notification websocket heartbeat job
INSERT INTO job_config (
    job_type, 
    enabled, 
    cron_expression, 
    execution_interval, 
    priority, 
    max_retries, 
    timeout_seconds, 
    is_system_job, 
    concurrency_limit, 
    description
) VALUES (
    'websocket_connection_cleanup', 
    true, 
    '*/10 * * * *', 
    'custom', 
    'medium', 
    2, 
    120, 
    true, 
    1, 
    'Clean up inactive WebSocket connections'
);

-- Comments for clarity
COMMENT ON TABLE notification_template IS 'Stores template definitions for all notification types';
COMMENT ON TABLE notification IS 'Stores notification records sent to recipients';
COMMENT ON TABLE notification_preference IS 'Stores user preferences for receiving notifications';
COMMENT ON TABLE notification_user_channel IS 'Stores user contact information for notification channels';
COMMENT ON TABLE notification_websocket_connection IS 'Tracks active WebSocket connections for real-time notifications';
COMMENT ON TABLE notification_topic IS 'Defines topics for pub/sub notifications';
COMMENT ON TABLE notification_subscription IS 'Tracks user subscriptions to notification topics';
COMMENT ON FUNCTION send_notification(UUID, VARCHAR, notification_type, VARCHAR, JSONB, VARCHAR, VARCHAR, UUID, notification_priority, TIMESTAMP, UUID) IS 'Creates and sends notifications to recipients';
COMMENT ON FUNCTION mark_notification_read(UUID, UUID) IS 'Marks a notification as read for a user';
COMMENT ON FUNCTION mark_all_notifications_read(UUID, VARCHAR, VARCHAR, UUID) IS 'Marks all notifications as read for a user, with optional filtering';