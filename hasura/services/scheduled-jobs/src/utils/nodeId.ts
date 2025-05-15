import { hostname } from 'os';
import { v4 as uuidv4 } from 'uuid';

// Generate a unique ID for this node
const NODE_ID = process.env.NODE_ID || `${hostname()}-${uuidv4().substring(0, 8)}`;

/**
 * Get the unique identifier for this node
 * Used for distributed job processing to identify which node is handling a job
 */
export function getNodeId(): string {
  return NODE_ID;
}

/**
 * Get information about this node
 */
export function getNodeInfo(): { id: string; hostname: string; pid: number; startTime: Date } {
  return {
    id: NODE_ID,
    hostname: hostname(),
    pid: process.pid,
    startTime: new Date()
  };
}