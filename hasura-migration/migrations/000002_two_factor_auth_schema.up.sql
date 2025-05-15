-- Two-Factor Authentication Schema for Fineract Hasura

-- Two-Factor Configuration Table
CREATE TABLE "two_factor_configuration" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(32) NOT NULL,
  "value" VARCHAR(1024),
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "name_unique" UNIQUE ("name")
);

-- Two-Factor Access Token Table
CREATE TABLE "two_factor_access_token" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "token" VARCHAR(256) NOT NULL,
  "valid_from" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "valid_to" TIMESTAMP WITH TIME ZONE NOT NULL,
  "enabled" BOOLEAN DEFAULT TRUE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_token_unique" UNIQUE ("user_id", "token"),
  FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
);

-- OTP Request Table
CREATE TABLE "otp_request" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "token" VARCHAR(10) NOT NULL,
  "valid_from" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "valid_to" TIMESTAMP WITH TIME ZONE NOT NULL,
  "delivery_method" VARCHAR(20) NOT NULL,
  "delivery_target" VARCHAR(255) NOT NULL,
  "extended_access_token" BOOLEAN DEFAULT FALSE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
);

-- Trusted Device Table
CREATE TABLE "trusted_device" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "device_id" VARCHAR(255) NOT NULL,
  "device_name" VARCHAR(255) NOT NULL,
  "device_type" VARCHAR(50),
  "last_ip" VARCHAR(50),
  "last_used" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
  "trusted" BOOLEAN DEFAULT TRUE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_device_unique" UNIQUE ("user_id", "device_id"),
  FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
);

-- TOTP Secret Table for Time-based One-Time Passwords
CREATE TABLE "totp_secret" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "secret_key" VARCHAR(255) NOT NULL,
  "enabled" BOOLEAN DEFAULT FALSE,
  "verified" BOOLEAN DEFAULT FALSE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_totp_unique" UNIQUE ("user_id"),
  FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
);

-- Insert default Two-Factor Configuration values
INSERT INTO "two_factor_configuration" ("name", "value") VALUES
  ('otp-delivery-email-enable', 'true'),
  ('otp-delivery-email-subject', 'Your Fineract One-Time Password'),
  ('otp-delivery-email-body', 'Your one-time password is: {{token}}. This code will expire in {{tokenLiveTimeInSec}} seconds.'),
  ('otp-delivery-sms-enable', 'true'),
  ('otp-delivery-sms-provider', '1'),
  ('otp-delivery-sms-text', 'Your Fineract one-time password is: {{token}}'),
  ('otp-token-live-time', '300'),
  ('otp-token-length', '6'),
  ('access-token-live-time', '7200'),
  ('access-token-live-time-extended', '864000'),
  ('totp-enabled', 'true'),
  ('trusted-devices-enabled', 'true'),
  ('trusted-device-live-time', '2592000');