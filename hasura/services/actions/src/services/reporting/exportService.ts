import fs from 'fs';
import path from 'path';
import { logger } from '../../utils/logger';
import { ReportFormat, ReportExecutionResult } from '../../models/reporting/report';
import XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import { Parser as Json2csvParser } from 'json2csv';
import { v4 as uuidv4 } from 'uuid';

// Directory for temporary export files
const EXPORT_DIR = process.env.EXPORT_DIR || '/tmp/fineract-exports';

// Ensure the export directory exists
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

/**
 * Export service to generate report files in various formats
 */
export class ExportService {
  /**
   * Export a report to the specified format
   * 
   * @param result The report execution result
   * @param format The desired export format
   * @param filename Base filename (without extension)
   * @returns Information about the exported file
   */
  public async exportReport(
    result: ReportExecutionResult,
    format: ReportFormat,
    filename?: string
  ): Promise<{
    filePath: string;
    fileName: string;
    contentType: string;
  }> {
    try {
      // Generate a unique filename if not provided
      const baseFilename = filename || 
        `${result.reportName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}`;
      
      // Export based on format
      switch (format) {
        case ReportFormat.PDF:
          return this.exportToPdf(result, baseFilename);
        case ReportFormat.EXCEL:
          return this.exportToExcel(result, baseFilename);
        case ReportFormat.CSV:
          return this.exportToCsv(result, baseFilename);
        case ReportFormat.JSON:
          return this.exportToJson(result, baseFilename);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      logger.error('Error exporting report', { 
        reportId: result.reportId,
        format, 
        error 
      });
      throw new Error(`Failed to export report: ${error.message}`);
    }
  }
  
  /**
   * Export report as PDF
   * 
   * @param result Report execution result
   * @param baseFilename Base filename
   * @returns Exported file information
   */
  private async exportToPdf(
    result: ReportExecutionResult,
    baseFilename: string
  ): Promise<{
    filePath: string;
    fileName: string;
    contentType: string;
  }> {
    return new Promise((resolve, reject) => {
      try {
        const fileName = `${baseFilename}.pdf`;
        const filePath = path.join(EXPORT_DIR, fileName);
        
        // Create a PDF document
        const doc = new PDFDocument({ 
          margin: 50,
          size: 'A4'
        });
        
        // Pipe output to file
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);
        
        // Add report title
        doc.fontSize(18).text(result.reportName, { align: 'center' });
        doc.moveDown();
        
        // Add report metadata
        doc.fontSize(10).text(`Generated: ${new Date(result.executionDate).toLocaleString()}`);
        doc.moveDown();
        
        // Add parameters if any
        if (Object.keys(result.parameters).length > 0) {
          doc.fontSize(12).text('Parameters:', { underline: true });
          
          for (const [key, value] of Object.entries(result.parameters)) {
            let displayValue = value;
            
            // Format date objects
            if (value instanceof Date) {
              displayValue = value.toLocaleDateString();
            } 
            // Format objects
            else if (typeof value === 'object' && value !== null) {
              displayValue = JSON.stringify(value);
            }
            
            doc.fontSize(10).text(`${key}: ${displayValue}`);
          }
          
          doc.moveDown();
        }
        
        // Add table headers
        const columns = result.columns.filter(col => col.isVisible);
        const columnWidths = {};
        const tableTop = doc.y;
        let tableWidth = 0;
        
        // Calculate column widths based on content
        columns.forEach((column, i) => {
          // Start with column name width
          let maxWidth = doc.widthOfString(column.displayName) + 10;
          
          // Check all data rows for maximum content width
          result.data.slice(0, 20).forEach(row => { // Only check first 20 rows for performance
            const value = row[column.name];
            const valueStr = value !== null && value !== undefined ? String(value) : '';
            const width = doc.widthOfString(valueStr) + 10;
            maxWidth = Math.max(maxWidth, width);
          });
          
          // Limit column width to reasonable maximum
          const colWidth = Math.min(maxWidth, 150);
          columnWidths[column.name] = colWidth;
          tableWidth += colWidth;
        });
        
        // Scale table to fit page width if needed
        const maxTableWidth = doc.page.width - 100; // 50pt margins on each side
        if (tableWidth > maxTableWidth) {
          const scaleFactor = maxTableWidth / tableWidth;
          Object.keys(columnWidths).forEach(key => {
            columnWidths[key] *= scaleFactor;
          });
          tableWidth = maxTableWidth;
        }
        
        // Draw headers
        doc.fontSize(10).font('Helvetica-Bold');
        let xPos = 50;
        columns.forEach(column => {
          doc.text(column.displayName, xPos, tableTop, { 
            width: columnWidths[column.name],
            align: 'left'
          });
          xPos += columnWidths[column.name];
        });
        
        // Draw header line
        doc.moveTo(50, tableTop + 20)
           .lineTo(50 + tableWidth, tableTop + 20)
           .stroke();
        
        // Draw data rows
        doc.font('Helvetica');
        let yPos = tableTop + 25;
        
        // Function to format cell value
        const formatCellValue = (value: any, dataType: string): string => {
          if (value === null || value === undefined) {
            return '';
          }
          
          switch(dataType) {
            case 'number':
            case 'decimal':
              return typeof value === 'number' 
                ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : String(value);
            case 'date':
              return value instanceof Date 
                ? value.toLocaleDateString() 
                : String(value);
            case 'boolean':
              return value ? 'Yes' : 'No';
            default:
              return String(value);
          }
        };
        
        // Limit number of rows to avoid huge PDF files
        const maxRows = 1000;
        const dataToDisplay = result.data.slice(0, maxRows);
        
        // Draw rows
        dataToDisplay.forEach((row, rowIndex) => {
          // Check if we need a new page
          if (yPos > doc.page.height - 50) {
            doc.addPage();
            yPos = 50;
            
            // Redraw headers on new page
            doc.fontSize(10).font('Helvetica-Bold');
            xPos = 50;
            columns.forEach(column => {
              doc.text(column.displayName, xPos, yPos, { 
                width: columnWidths[column.name],
                align: 'left'
              });
              xPos += columnWidths[column.name];
            });
            
            // Draw header line
            doc.moveTo(50, yPos + 20)
               .lineTo(50 + tableWidth, yPos + 20)
               .stroke();
            
            doc.font('Helvetica');
            yPos += 25;
          }
          
          // Draw row with alternating background
          if (rowIndex % 2 === 1) {
            doc.rect(50, yPos, tableWidth, 20).fill('#f5f5f5').stroke('#f5f5f5');
          }
          
          // Draw cell values
          xPos = 50;
          columns.forEach(column => {
            const value = formatCellValue(row[column.name], column.dataType);
            
            // Align numbers to right
            const align = ['number', 'decimal'].includes(column.dataType) ? 'right' : 'left';
            
            doc.text(value, xPos, yPos, { 
              width: columnWidths[column.name],
              align,
              lineBreak: false,
              ellipsis: true
            });
            
            xPos += columnWidths[column.name];
          });
          
          yPos += 20;
        });
        
        // Add totals if available
        if (result.totals && Object.keys(result.totals).length > 0) {
          // Draw totals separator line
          doc.moveTo(50, yPos)
             .lineTo(50 + tableWidth, yPos)
             .stroke();
          
          yPos += 10;
          doc.fontSize(10).font('Helvetica-Bold').text('Totals:', 50, yPos);
          yPos += 20;
          
          // Display totals for each column
          columns.forEach(column => {
            const totalValue = result.totals[column.name];
            if (totalValue !== undefined && totalValue !== null) {
              const formattedValue = formatCellValue(totalValue, column.dataType);
              doc.text(`${column.displayName}: ${formattedValue}`, 70, yPos);
              yPos += 15;
            }
          });
        }
        
        // Add pagination info if available
        if (result.paging) {
          doc.fontSize(10).text(`Page ${result.paging.pageNumber} of ${result.paging.totalPages}`, {
            align: 'center'
          });
          
          // If we only displayed a subset due to PDF size limits
          if (result.data.length > maxRows) {
            doc.fontSize(9).text(`Note: Only the first ${maxRows} of ${result.data.length} rows are displayed.`, {
              align: 'center'
            });
          }
        }
        
        // Add footer with execution time
        doc.fontSize(8).text(`Execution time: ${result.executionTimeMs}ms`, 50, doc.page.height - 50);
        
        // Finalize the PDF and end the stream
        doc.end();
        
        stream.on('finish', () => {
          resolve({
            filePath,
            fileName,
            contentType: 'application/pdf'
          });
        });
        
        stream.on('error', error => {
          reject(new Error(`Error writing PDF file: ${error.message}`));
        });
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Export report as Excel
   * 
   * @param result Report execution result
   * @param baseFilename Base filename
   * @returns Exported file information
   */
  private async exportToExcel(
    result: ReportExecutionResult,
    baseFilename: string
  ): Promise<{
    filePath: string;
    fileName: string;
    contentType: string;
  }> {
    try {
      const fileName = `${baseFilename}.xlsx`;
      const filePath = path.join(EXPORT_DIR, fileName);
      
      // Create a worksheet
      const wsData = [
        // Headers row
        result.columns.filter(col => col.isVisible).map(col => col.displayName)
      ];
      
      // Format data for worksheet
      result.data.forEach(row => {
        const rowData = result.columns
          .filter(col => col.isVisible)
          .map(col => {
            const value = row[col.name];
            
            // Keep null values as empty cells
            if (value === null || value === undefined) {
              return null;
            }
            
            // Format date values
            if (col.dataType === 'date' && value instanceof Date) {
              return value;
            }
            
            return value;
          });
        
        wsData.push(rowData);
      });
      
      // Add totals if available
      if (result.totals && Object.keys(result.totals).length > 0) {
        wsData.push([]);  // Empty row
        wsData.push(['Totals']);
        
        result.columns.filter(col => col.isVisible).forEach(column => {
          const totalValue = result.totals[column.name];
          if (totalValue !== undefined && totalValue !== null) {
            wsData.push([column.displayName, totalValue]);
          }
        });
      }
      
      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Set column widths based on content
      const cols = result.columns.filter(col => col.isVisible).map((col, i) => {
        // Calculate column width based on header and data content
        let maxWidth = col.displayName.length;
        
        // Check data rows for maximum length
        result.data.slice(0, 100).forEach(row => { // Only check first 100 rows for performance
          const value = row[col.name];
          if (value !== null && value !== undefined) {
            const valueStr = String(value);
            maxWidth = Math.max(maxWidth, valueStr.length);
          }
        });
        
        // Set width with some padding (capped at a reasonable maximum)
        return { wch: Math.min(maxWidth + 2, 50) };
      });
      
      ws['!cols'] = cols;
      
      // Create workbook and add metadata
      const wb = XLSX.utils.book_new();
      wb.Props = {
        Title: result.reportName,
        CreatedDate: new Date(result.executionDate)
      };
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Report');
      
      // Create a metadata sheet with report parameters
      if (Object.keys(result.parameters).length > 0) {
        const metaData = [
          ['Report Name', result.reportName],
          ['Generated On', new Date(result.executionDate).toLocaleString()],
          [''],
          ['Parameters:']
        ];
        
        for (const [key, value] of Object.entries(result.parameters)) {
          let displayValue = value;
          
          // Format date objects
          if (value instanceof Date) {
            displayValue = value.toLocaleDateString();
          } 
          // Format objects
          else if (typeof value === 'object' && value !== null) {
            displayValue = JSON.stringify(value);
          }
          
          metaData.push([key, displayValue]);
        }
        
        const metaSheet = XLSX.utils.aoa_to_sheet(metaData);
        XLSX.utils.book_append_sheet(wb, metaSheet, 'Metadata');
      }
      
      // Write to file
      XLSX.writeFile(wb, filePath);
      
      return {
        filePath,
        fileName,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };
    } catch (error) {
      throw new Error(`Error exporting to Excel: ${error.message}`);
    }
  }
  
  /**
   * Export report as CSV
   * 
   * @param result Report execution result
   * @param baseFilename Base filename
   * @returns Exported file information
   */
  private async exportToCsv(
    result: ReportExecutionResult,
    baseFilename: string
  ): Promise<{
    filePath: string;
    fileName: string;
    contentType: string;
  }> {
    try {
      const fileName = `${baseFilename}.csv`;
      const filePath = path.join(EXPORT_DIR, fileName);
      
      // Get visible columns
      const fields = result.columns
        .filter(col => col.isVisible)
        .map(col => ({
          label: col.displayName,
          value: col.name
        }));
      
      // Create CSV parser
      const json2csvParser = new Json2csvParser({ fields });
      
      // Convert to CSV
      const csv = json2csvParser.parse(result.data);
      
      // Add report metadata as comments at the top
      let metadataCSV = `# ${result.reportName}\n`;
      metadataCSV += `# Generated: ${new Date(result.executionDate).toLocaleString()}\n`;
      
      // Add parameters
      if (Object.keys(result.parameters).length > 0) {
        metadataCSV += '# Parameters:\n';
        
        for (const [key, value] of Object.entries(result.parameters)) {
          let displayValue = value;
          
          // Format date objects
          if (value instanceof Date) {
            displayValue = value.toLocaleDateString();
          } 
          // Format objects
          else if (typeof value === 'object' && value !== null) {
            displayValue = JSON.stringify(value);
          }
          
          metadataCSV += `# ${key}: ${displayValue}\n`;
        }
      }
      
      // Add totals if available
      if (result.totals && Object.keys(result.totals).length > 0) {
        metadataCSV += '# Totals:\n';
        
        for (const [key, value] of Object.entries(result.totals)) {
          metadataCSV += `# ${key}: ${value}\n`;
        }
      }
      
      // Add metadata and CSV content
      const finalCSV = `${metadataCSV}\n${csv}`;
      
      // Write to file
      fs.writeFileSync(filePath, finalCSV);
      
      return {
        filePath,
        fileName,
        contentType: 'text/csv'
      };
    } catch (error) {
      throw new Error(`Error exporting to CSV: ${error.message}`);
    }
  }
  
  /**
   * Export report as JSON
   * 
   * @param result Report execution result
   * @param baseFilename Base filename
   * @returns Exported file information
   */
  private async exportToJson(
    result: ReportExecutionResult,
    baseFilename: string
  ): Promise<{
    filePath: string;
    fileName: string;
    contentType: string;
  }> {
    try {
      const fileName = `${baseFilename}.json`;
      const filePath = path.join(EXPORT_DIR, fileName);
      
      // Write to file with pretty formatting
      fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
      
      return {
        filePath,
        fileName,
        contentType: 'application/json'
      };
    } catch (error) {
      throw new Error(`Error exporting to JSON: ${error.message}`);
    }
  }
}

// Singleton instance
export const exportService = new ExportService();