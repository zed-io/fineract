-- Seed file for beneficiary notification templates
-- This file contains template definitions for common beneficiary notification events

-- Set search path to the tenant schema
SET search_path TO fineract_default;

-- Clear existing templates (for clean reinstallation if needed)
TRUNCATE TABLE savings_beneficiary_notification_template CASCADE;

-- Insert email templates
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
    created_date
) VALUES 
-- Email templates
(
    uuid_generate_v4(), 
    'Beneficiary Addition Notification', 
    'BENEFICIARY_ADDITION_EMAIL', 
    'You have been added as a beneficiary',
    'Dear {{beneficiaryName}},

You have been added as a beneficiary to savings account {{accountNo}} by {{accountOwnerName}}.

Your beneficiary details:
- Relationship: {{relationshipType}}
- Share Percentage: {{percentageShare}}%

If you have any questions or concerns, please contact our support team.

Thank you,
The Fineract Team',
    'email', 
    'addition', 
    'Email notification sent to beneficiaries when they are added to an account',
    true, 
    NOW()
),
(
    uuid_generate_v4(), 
    'Beneficiary Verification Notification', 
    'BENEFICIARY_VERIFICATION_EMAIL', 
    'Your beneficiary status has been verified',
    'Dear {{beneficiaryName}},

Your beneficiary status for savings account {{accountNo}} has been verified and approved.

Your beneficiary details:
- Relationship: {{relationshipType}}
- Share Percentage: {{percentageShare}}%

If you have any questions or concerns, please contact our support team.

Thank you,
The Fineract Team',
    'email', 
    'verification', 
    'Email notification sent to beneficiaries when their status is verified',
    true, 
    NOW()
),
(
    uuid_generate_v4(), 
    'Beneficiary Modification Notification', 
    'BENEFICIARY_MODIFICATION_EMAIL', 
    'Your beneficiary details have been updated',
    'Dear {{beneficiaryName}},

Your beneficiary details for savings account {{accountNo}} have been updated.

Updated beneficiary details:
- Relationship: {{relationshipType}}
- Share Percentage: {{percentageShare}}%

If you did not authorize this change or have any concerns, please contact our support team immediately.

Thank you,
The Fineract Team',
    'email', 
    'modification', 
    'Email notification sent to beneficiaries when their details are modified',
    true, 
    NOW()
),
(
    uuid_generate_v4(), 
    'Beneficiary Removal Notification', 
    'BENEFICIARY_REMOVAL_EMAIL', 
    'You have been removed as a beneficiary',
    'Dear {{beneficiaryName}},

You have been removed as a beneficiary from savings account {{accountNo}}.

If you did not authorize this change or have any concerns, please contact our support team immediately.

Thank you,
The Fineract Team',
    'email', 
    'removal', 
    'Email notification sent to beneficiaries when they are removed from an account',
    true, 
    NOW()
),
(
    uuid_generate_v4(), 
    'Document Uploaded Notification', 
    'DOCUMENT_UPLOADED_EMAIL', 
    'Document uploaded to your beneficiary profile',
    'Dear {{beneficiaryName}},

A new document has been uploaded to your beneficiary profile for savings account {{accountNo}}.

Document details:
- Type: {{documentType}}
- Uploaded by: {{uploadedBy}}
- Date: {{uploadDate}}

This is for your information. No action is required from your side.

Thank you,
The Fineract Team',
    'email', 
    'document_upload', 
    'Email notification sent to beneficiaries when a document is uploaded to their profile',
    true, 
    NOW()
),
(
    uuid_generate_v4(), 
    'Document Verification Notification', 
    'DOCUMENT_VERIFIED_EMAIL', 
    'Your beneficiary document has been verified',
    'Dear {{beneficiaryName}},

Your document for savings account {{accountNo}} has been verified and approved.

Document details:
- Type: {{documentType}}
- Verified by: {{verifiedBy}}
- Verification date: {{verificationDate}}

Thank you,
The Fineract Team',
    'email', 
    'document_verification', 
    'Email notification sent to beneficiaries when their document is verified',
    true, 
    NOW()
),
(
    uuid_generate_v4(), 
    'Annual Beneficiary Confirmation Request', 
    'ANNUAL_CONFIRMATION_EMAIL', 
    'Annual Beneficiary Confirmation Required',
    'Dear {{beneficiaryName}},

As part of our annual review process, we need you to confirm your beneficiary status for savings account {{accountNo}}.

Your current beneficiary details:
- Relationship: {{relationshipType}}
- Share Percentage: {{percentageShare}}%

Please log in to our online portal or visit your nearest branch to confirm these details before {{confirmationDeadline}}.

Thank you,
The Fineract Team',
    'email', 
    'annual_confirmation', 
    'Annual email requesting beneficiaries to confirm their details',
    true, 
    NOW()
),
(
    uuid_generate_v4(), 
    'Account Owner Death Notification', 
    'ACCOUNT_OWNER_DEATH_EMAIL', 
    'Important: Beneficiary Claim Information',
    'Dear {{beneficiaryName}},

We have been notified of the passing of {{accountOwnerName}}, the owner of savings account {{accountNo}} for which you are registered as a beneficiary.

As a beneficiary, you are entitled to {{percentageShare}}% of the account balance according to our records.

To start the claim process, please:
1. Visit our nearest branch with your identification documents
2. Bring a copy of the death certificate
3. Bring proof of your relationship to the deceased

Please contact our support team if you have any questions.

Our sincerest condolences during this difficult time.

The Fineract Team',
    'email', 
    'account_owner_death', 
    'Email notification sent to beneficiaries upon the death of the account owner',
    true, 
    NOW()
),

-- SMS templates
(
    uuid_generate_v4(), 
    'Beneficiary Addition SMS', 
    'BENEFICIARY_ADDITION_SMS', 
    'Beneficiary Addition',
    'You have been added as a beneficiary to savings account {{accountNo}} with {{percentageShare}}% share. For queries, contact support.',
    'sms', 
    'addition', 
    'SMS notification sent to beneficiaries when they are added to an account',
    true, 
    NOW()
),
(
    uuid_generate_v4(), 
    'Beneficiary Verification SMS', 
    'BENEFICIARY_VERIFICATION_SMS', 
    'Beneficiary Verified',
    'Your beneficiary status for savings account {{accountNo}} has been verified and approved with {{percentageShare}}% share.',
    'sms', 
    'verification', 
    'SMS notification sent to beneficiaries when their status is verified',
    true, 
    NOW()
),
(
    uuid_generate_v4(), 
    'Beneficiary Modification SMS', 
    'BENEFICIARY_MODIFICATION_SMS', 
    'Beneficiary Updated',
    'Your beneficiary details for savings account {{accountNo}} have been updated. New share: {{percentageShare}}%.',
    'sms', 
    'modification', 
    'SMS notification sent to beneficiaries when their details are modified',
    true, 
    NOW()
),
(
    uuid_generate_v4(), 
    'Beneficiary Removal SMS', 
    'BENEFICIARY_REMOVAL_SMS', 
    'Beneficiary Removed',
    'You have been removed as a beneficiary from savings account {{accountNo}}. For queries, contact support.',
    'sms', 
    'removal', 
    'SMS notification sent to beneficiaries when they are removed from an account',
    true, 
    NOW()
),
(
    uuid_generate_v4(), 
    'Document Uploaded SMS', 
    'DOCUMENT_UPLOADED_SMS', 
    'Document Uploaded',
    'A new document has been uploaded to your beneficiary profile for account {{accountNo}}. No action required.',
    'sms', 
    'document_upload', 
    'SMS notification sent to beneficiaries when a document is uploaded to their profile',
    true, 
    NOW()
),
(
    uuid_generate_v4(), 
    'Document Verification SMS', 
    'DOCUMENT_VERIFIED_SMS', 
    'Document Verified',
    'Your document for account {{accountNo}} has been verified and approved.',
    'sms', 
    'document_verification', 
    'SMS notification sent to beneficiaries when their document is verified',
    true, 
    NOW()
),
(
    uuid_generate_v4(), 
    'Annual Confirmation SMS', 
    'ANNUAL_CONFIRMATION_SMS', 
    'Annual Confirmation',
    'Please confirm your beneficiary status for account {{accountNo}} by {{confirmationDeadline}}. Visit branch or login to portal.',
    'sms', 
    'annual_confirmation', 
    'Annual SMS requesting beneficiaries to confirm their details',
    true, 
    NOW()
),
(
    uuid_generate_v4(), 
    'Account Owner Death SMS', 
    'ACCOUNT_OWNER_DEATH_SMS', 
    'Beneficiary Claim',
    'Important: As beneficiary of account {{accountNo}}, please visit our branch to claim your {{percentageShare}}% share following the passing of {{accountOwnerName}}.',
    'sms', 
    'account_owner_death', 
    'SMS notification sent to beneficiaries upon the death of the account owner',
    true, 
    NOW()
);