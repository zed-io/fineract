/**
 * Utility for file system operations
 * Provides functions for managing file storage, directories, and file handling
 */

import { promises as fs } from 'fs';
import path from 'path';
import { logger } from './logger';

/**
 * Create directory recursively if it doesn't exist
 * @param directoryPath Directory path to create
 */
export async function createDirectory(directoryPath: string): Promise<void> {
  try {
    await fs.mkdir(directoryPath, { recursive: true });
  } catch (error) {
    logger.error('Error creating directory', { error, directoryPath });
    throw error;
  }
}

/**
 * Check if file exists
 * @param filePath Path to check
 * @returns Boolean indicating if file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete file if it exists
 * @param filePath Path to file
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    if (await fileExists(filePath)) {
      await fs.unlink(filePath);
    }
  } catch (error) {
    logger.error('Error deleting file', { error, filePath });
    throw error;
  }
}

/**
 * Move file from source to destination
 * @param sourcePath Source file path
 * @param destinationPath Destination file path
 */
export async function moveFile(sourcePath: string, destinationPath: string): Promise<void> {
  try {
    // Create destination directory if it doesn't exist
    const destinationDir = path.dirname(destinationPath);
    await createDirectory(destinationDir);
    
    // Move the file
    await fs.rename(sourcePath, destinationPath);
  } catch (error) {
    logger.error('Error moving file', { error, sourcePath, destinationPath });
    throw error;
  }
}

/**
 * Copy file from source to destination
 * @param sourcePath Source file path
 * @param destinationPath Destination file path
 */
export async function copyFile(sourcePath: string, destinationPath: string): Promise<void> {
  try {
    // Create destination directory if it doesn't exist
    const destinationDir = path.dirname(destinationPath);
    await createDirectory(destinationDir);
    
    // Copy the file
    await fs.copyFile(sourcePath, destinationPath);
  } catch (error) {
    logger.error('Error copying file', { error, sourcePath, destinationPath });
    throw error;
  }
}

/**
 * Get MIME type from file extension
 * @param filePath Path to file
 * @returns MIME type string
 */
export function getMimeTypeFromPath(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  
  switch (extension) {
    case '.pdf':
      return 'application/pdf';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.doc':
      return 'application/msword';
    case '.docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.xls':
      return 'application/vnd.ms-excel';
    case '.xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case '.txt':
      return 'text/plain';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Generate a file path for a new file
 * @param baseDir Base directory
 * @param entityId Entity ID (e.g., loanId)
 * @param fileName Original file name
 * @returns Unique file path
 */
export function generateFilePath(baseDir: string, entityId: string, fileName: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const extension = path.extname(fileName);
  const baseName = path.basename(fileName, extension);
  
  // Sanitize filename
  const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9]/g, '_');
  
  return path.join(baseDir, entityId, `${sanitizedBaseName}_${timestamp}${extension}`);
}

/**
 * Get file size in human readable format
 * @param sizeInBytes File size in bytes
 * @returns Human readable size string
 */
export function getReadableFileSize(sizeInBytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = sizeInBytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}