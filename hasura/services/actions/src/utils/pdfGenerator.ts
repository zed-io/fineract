/**
 * PDF Generator utility for Fineract Hasura Actions
 */

import * as fs from 'fs';
import * as path from 'path';
import * as mustache from 'mustache';
import * as puppeteer from 'puppeteer';
import { logger } from './logger';

/**
 * Path to templates directory
 */
const TEMPLATES_DIR = path.join(__dirname, '..', '..', 'templates');

/**
 * Create a PDF from a template with data
 * @param templateName Name of the template (without extension)
 * @param data Data to populate the template with
 * @param outputPath Path to save the PDF file
 * @returns Path to the generated PDF file
 */
export async function createPdf(templateName: string, data: any, outputPath: string): Promise<string> {
  try {
    // Read the template
    const templatePath = path.join(TEMPLATES_DIR, `${templateName}.html`);
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template "${templateName}" not found at ${templatePath}`);
    }
    
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    
    // Render the template with data
    const renderedHtml = mustache.render(templateContent, data);
    
    // Create a temporary HTML file
    const tempHtmlPath = `${outputPath}.html`;
    fs.writeFileSync(tempHtmlPath, renderedHtml);
    
    // Launch a browser instance
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true
    });
    
    try {
      // Create a new page
      const page = await browser.newPage();
      
      // Navigate to the HTML file
      await page.goto(`file://${tempHtmlPath}`, { waitUntil: 'networkidle0' });
      
      // Generate PDF
      await page.pdf({
        path: outputPath,
        format: 'A4',
        margin: {
          top: '1cm',
          right: '1cm',
          bottom: '1cm',
          left: '1cm'
        },
        printBackground: true
      });
      
      // Clean up
      await browser.close();
      fs.unlinkSync(tempHtmlPath);
      
      return outputPath;
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error) {
    logger.error('Error generating PDF', { error, templateName });
    throw error;
  }
}