import nodemailer from 'nodemailer';
import { logger } from './logger';
import { pool } from './db';

// Email configuration
let emailConfig: any = null;

/**
 * Initialize email configuration
 */
async function initEmailConfig() {
  try {
    // Get email configuration from database or environment variables
    const configResult = await pool.query(
      `SELECT * FROM configuration 
       WHERE name IN ('email.host', 'email.port', 'email.username', 'email.password', 'email.from')`
    );
    
    if (configResult.rowCount > 0) {
      const config: any = {};
      configResult.rows.forEach((row) => {
        config[row.name.replace('email.', '')] = row.value;
      });
      
      emailConfig = {
        host: config.host,
        port: parseInt(config.port || '587', 10),
        secure: parseInt(config.port || '587', 10) === 465,
        auth: {
          user: config.username,
          pass: config.password
        },
        from: config.from || 'noreply@fineract.org'
      };
    } else {
      // Use environment variables as fallback
      emailConfig = {
        host: process.env.EMAIL_HOST || 'smtp.example.com',
        port: parseInt(process.env.EMAIL_PORT || '587', 10),
        secure: parseInt(process.env.EMAIL_PORT || '587', 10) === 465,
        auth: {
          user: process.env.EMAIL_USERNAME || '',
          pass: process.env.EMAIL_PASSWORD || ''
        },
        from: process.env.EMAIL_FROM || 'noreply@fineract.org'
      };
    }
  } catch (error) {
    logger.error('Error initializing email configuration:', error);
    throw error;
  }
}

/**
 * Send an email
 * @param to Recipient email address
 * @param subject Email subject
 * @param body Email body
 * @param isHtml Whether the body is HTML
 */
export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  isHtml: boolean = false
): Promise<void> {
  try {
    if (!emailConfig) {
      await initEmailConfig();
    }
    
    const transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: emailConfig.auth
    });
    
    const mailOptions = {
      from: emailConfig.from,
      to,
      subject,
      [isHtml ? 'html' : 'text']: body
    };
    
    await transporter.sendMail(mailOptions);
    logger.info(`Email sent to ${to}`);
  } catch (error) {
    logger.error('Error sending email:', error);
    throw error;
  }
}