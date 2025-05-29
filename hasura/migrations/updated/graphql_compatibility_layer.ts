/**
 * GraphQL Schema Compatibility Layer
 * 
 * This module provides utility functions to ensure compatibility between
 * frontend GraphQL operations and the updated schema structure.
 * 
 * Use this as a transitional layer while updating frontend code to use
 * the new schema structure without prefixes.
 */

import { createProxyMiddleware } from 'http-proxy-middleware';
import { Request, Response, NextFunction } from 'express';

/**
 * Schema name mapping from old to new
 */
const SCHEMA_MAPPING = {
  'fineract_tenants': 'tenants',
  'fineract_default': 'default',
};

/**
 * Transforms GraphQL queries to use the new schema structure
 * @param query The original GraphQL query
 * @returns Transformed query using new schema names
 */
export function transformQuery(query: string): string {
  let transformedQuery = query;
  
  // Replace schema references in queries
  Object.entries(SCHEMA_MAPPING).forEach(([oldSchema, newSchema]) => {
    const oldSchemaPattern = new RegExp(`"schema":\\s*"${oldSchema}"`, 'g');
    transformedQuery = transformedQuery.replace(oldSchemaPattern, `"schema": "${newSchema}"`);
    
    // Also replace direct schema references that might be in queries
    transformedQuery = transformedQuery.replace(
      new RegExp(`${oldSchema}\\.`, 'g'), 
      `${newSchema}.`
    );
  });
  
  return transformedQuery;
}

/**
 * GraphQL compatibility middleware for Express
 * Transparently transforms requests to use the new schema structure
 */
export function graphqlCompatibilityMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.body && req.body.query) {
    req.body.query = transformQuery(req.body.query);
  }
  
  next();
}

/**
 * Creates a proxy middleware for Hasura GraphQL endpoint
 * @param target The Hasura GraphQL endpoint URL
 * @returns Configured proxy middleware
 */
export function createGraphQLProxy(target: string) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: { '^/graphql': '/v1/graphql' },
    onProxyReq: (proxyReq, req, res) => {
      if (req.body) {
        const bodyData = JSON.stringify(req.body);
        const transformedBody = transformQuery(bodyData);
        
        // Update content-length
        proxyReq.setHeader('Content-Length', Buffer.byteLength(transformedBody));
        
        // Write the transformed body to the request
        proxyReq.write(transformedBody);
        proxyReq.end();
      }
    }
  });
}

/**
 * Utility function to transform GraphQL operation responses 
 * This can be used to maintain backward compatibility if needed
 */
export function transformResponse(response: any): any {
  // Currently no transformations needed for responses
  // Add transformations here if the schema changes affect response structure
  return response;
}

/**
 * Example usage in Express app:
 * 
 * ```
 * import express from 'express';
 * import { graphqlCompatibilityMiddleware, createGraphQLProxy } from './graphql_compatibility_layer';
 * 
 * const app = express();
 * 
 * // Apply compatibility middleware
 * app.use('/graphql', graphqlCompatibilityMiddleware);
 * 
 * // Or use the proxy for remote Hasura instance
 * app.use('/graphql', createGraphQLProxy('http://localhost:8080'));
 * 
 * app.listen(3000, () => {
 *   console.log('Compatibility layer running on port 3000');
 * });
 * ```
 */