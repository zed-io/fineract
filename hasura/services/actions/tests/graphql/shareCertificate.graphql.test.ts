/**
 * Share Certificate GraphQL API Tests
 * Tests the GraphQL API for share certificate operations
 */

import { request, gql } from 'graphql-request';
import { v4 as uuidv4 } from 'uuid';

// Define GraphQL endpoint URL
const endpoint = process.env.GRAPHQL_ENDPOINT || 'http://localhost:8080/v1/graphql';

// Skip these tests when running in CI or non-GraphQL API mode
const runGraphQLTests = process.env.RUN_GRAPHQL_TESTS === 'true';
const testGroup = runGraphQLTests ? describe : describe.skip;

// Authorization headers
const getHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`
});

testGroup('Share Certificate GraphQL API Tests', () => {
  // Test data
  let authToken = '';
  let userId = '';
  let templateId = '';
  let seriesId = '';
  let productId = '';
  let accountId = '';
  let certificateId = '';
  let certificateNumber = '';
  let verificationCode = '';
  let batchId = '';

  // Login before tests
  beforeAll(async () => {
    // Login mutation
    const loginMutation = gql`
      mutation Login($username: String!, $password: String!) {
        login(username: $username, password: $password) {
          token
          userId
        }
      }
    `;
    
    const loginVariables = {
      username: process.env.TEST_USERNAME || 'testuser',
      password: process.env.TEST_PASSWORD || 'password'
    };
    
    try {
      const data = await request(endpoint, loginMutation, loginVariables);
      authToken = data.login.token;
      userId = data.login.userId;
      
      // Get test product and account
      const getTestDataQuery = gql`
        query GetTestData {
          share_product(limit: 1) {
            id
            name
          }
          share_account(where: {status: {_eq: "active"}}, limit: 1) {
            id
            account_no
          }
        }
      `;
      
      const testDataResult = await request(
        endpoint, 
        getTestDataQuery,
        {},
        getHeaders(authToken)
      );
      
      productId = testDataResult.share_product[0].id;
      accountId = testDataResult.share_account[0].id;
    } catch (error) {
      console.error('Error in beforeAll setup:', error);
      throw error;
    }
  });

  describe('Template Management', () => {
    test('should create a certificate template', async () => {
      const createTemplateMutation = gql`
        mutation CreateCertificateTemplate($input: CreateCertificateTemplateInput!) {
          createCertificateTemplate(input: $input) {
            templateId
            name
          }
        }
      `;
      
      const templateName = `GraphQL Test Template ${new Date().toISOString()}`;
      const templateVariables = {
        input: {
          name: templateName,
          description: 'Template for GraphQL testing',
          templateContent: `
            <!DOCTYPE html>
            <html>
            <head>
              <title>GraphQL Test Certificate</title>
              <style>
                body { font-family: Arial, sans-serif; }
                .certificate { border: 2px solid #000; padding: 20px; }
                .title { font-size: 24px; text-align: center; }
              </style>
            </head>
            <body>
              <div class="certificate">
                <div class="title">GraphQL Test Certificate</div>
                <p>This certifies that <strong>{{clientName}}</strong> owns <strong>{{sharesQuantity}}</strong> shares.</p>
                <p>Certificate Number: {{certificateNumber}}</p>
                <p>Issue Date: {{issueDate}}</p>
                <p>Verification Code: {{verificationCode}}</p>
              </div>
            </body>
            </html>
          `,
          isActive: true,
          isDefault: false
        }
      };
      
      try {
        const result = await request(
          endpoint, 
          createTemplateMutation, 
          templateVariables,
          getHeaders(authToken)
        );
        
        expect(result).toHaveProperty('createCertificateTemplate');
        expect(result.createCertificateTemplate).toHaveProperty('templateId');
        expect(result.createCertificateTemplate.name).toBe(templateName);
        
        templateId = result.createCertificateTemplate.templateId;
      } catch (error) {
        console.error('Error creating template:', error);
        throw error;
      }
    });
    
    test('should query certificate templates', async () => {
      const getTemplatesQuery = gql`
        query GetCertificateTemplates {
          share_certificate_template {
            id
            name
            description
            is_active
            is_default
            created_date
          }
        }
      `;
      
      try {
        const result = await request(
          endpoint, 
          getTemplatesQuery,
          {},
          getHeaders(authToken)
        );
        
        expect(result).toHaveProperty('share_certificate_template');
        expect(Array.isArray(result.share_certificate_template)).toBe(true);
        expect(result.share_certificate_template.length).toBeGreaterThan(0);
        
        // Find our template
        const ourTemplate = result.share_certificate_template.find(t => t.id === templateId);
        expect(ourTemplate).toBeDefined();
      } catch (error) {
        console.error('Error querying templates:', error);
        throw error;
      }
    });
    
    test('should update a certificate template', async () => {
      const updateTemplateMutation = gql`
        mutation UpdateCertificateTemplate($input: UpdateCertificateTemplateInput!) {
          updateCertificateTemplate(input: $input) {
            templateId
            name
            updated
          }
        }
      `;
      
      const updatedName = `Updated GraphQL Template ${new Date().toISOString()}`;
      const updateVariables = {
        input: {
          templateId,
          name: updatedName,
          description: 'Updated description for GraphQL testing'
        }
      };
      
      try {
        const result = await request(
          endpoint, 
          updateTemplateMutation, 
          updateVariables,
          getHeaders(authToken)
        );
        
        expect(result).toHaveProperty('updateCertificateTemplate');
        expect(result.updateCertificateTemplate).toHaveProperty('templateId', templateId);
        expect(result.updateCertificateTemplate).toHaveProperty('name', updatedName);
        expect(result.updateCertificateTemplate).toHaveProperty('updated', true);
      } catch (error) {
        console.error('Error updating template:', error);
        throw error;
      }
    });
  });

  describe('Series Management', () => {
    test('should create a certificate series', async () => {
      const createSeriesMutation = gql`
        mutation CreateCertificateSeries($input: CreateCertificateSeriesInput!) {
          createCertificateSeries(input: $input) {
            seriesId
            prefix
          }
        }
      `;
      
      const seriesPrefix = `TST${Math.floor(Math.random() * 10000)}`;
      const seriesVariables = {
        input: {
          productId,
          prefix: seriesPrefix,
          nextNumber: 1,
          isActive: true
        }
      };
      
      try {
        const result = await request(
          endpoint, 
          createSeriesMutation, 
          seriesVariables,
          getHeaders(authToken)
        );
        
        expect(result).toHaveProperty('createCertificateSeries');
        expect(result.createCertificateSeries).toHaveProperty('seriesId');
        expect(result.createCertificateSeries).toHaveProperty('prefix', seriesPrefix);
        
        seriesId = result.createCertificateSeries.seriesId;
      } catch (error) {
        console.error('Error creating series:', error);
        throw error;
      }
    });
    
    test('should query certificate series', async () => {
      const getSeriesQuery = gql`
        query GetCertificateSeries($productId: uuid!) {
          share_certificate_series(where: {product_id: {_eq: $productId}}) {
            id
            prefix
            next_number
            is_active
          }
        }
      `;
      
      const variables = {
        productId
      };
      
      try {
        const result = await request(
          endpoint, 
          getSeriesQuery,
          variables,
          getHeaders(authToken)
        );
        
        expect(result).toHaveProperty('share_certificate_series');
        expect(Array.isArray(result.share_certificate_series)).toBe(true);
        expect(result.share_certificate_series.length).toBeGreaterThan(0);
        
        // Find our series
        const ourSeries = result.share_certificate_series.find(s => s.id === seriesId);
        expect(ourSeries).toBeDefined();
      } catch (error) {
        console.error('Error querying series:', error);
        throw error;
      }
    });
  });

  describe('Certificate Generation', () => {
    test('should generate a share certificate', async () => {
      const generateCertificateMutation = gql`
        mutation GenerateCertificate($input: GenerateCertificateInput!) {
          generateCertificate(input: $input) {
            certificateId
            certificateNumber
            accountId
            issueDate
            sharesQuantity
            downloadUrl
          }
        }
      `;
      
      const certVariables = {
        input: {
          accountId,
          templateId,
          issueDate: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
          sharesQuantity: 100
        }
      };
      
      try {
        const result = await request(
          endpoint, 
          generateCertificateMutation, 
          certVariables,
          getHeaders(authToken)
        );
        
        expect(result).toHaveProperty('generateCertificate');
        expect(result.generateCertificate).toHaveProperty('certificateId');
        expect(result.generateCertificate).toHaveProperty('certificateNumber');
        expect(result.generateCertificate).toHaveProperty('downloadUrl');
        expect(result.generateCertificate.accountId).toBe(accountId);
        
        certificateId = result.generateCertificate.certificateId;
        certificateNumber = result.generateCertificate.certificateNumber;
      } catch (error) {
        console.error('Error generating certificate:', error);
        throw error;
      }
    });
    
    test('should query certificate details', async () => {
      const getCertificateQuery = gql`
        query GetCertificate($certificateId: uuid!) {
          share_certificate_by_pk(id: $certificateId) {
            id
            certificate_number
            account_id
            issue_date
            shares_quantity
            share_value
            total_value
            status
            verification_code
          }
        }
      `;
      
      const variables = {
        certificateId
      };
      
      try {
        const result = await request(
          endpoint, 
          getCertificateQuery,
          variables,
          getHeaders(authToken)
        );
        
        expect(result).toHaveProperty('share_certificate_by_pk');
        expect(result.share_certificate_by_pk).toHaveProperty('id', certificateId);
        expect(result.share_certificate_by_pk).toHaveProperty('certificate_number', certificateNumber);
        expect(result.share_certificate_by_pk).toHaveProperty('verification_code');
        expect(result.share_certificate_by_pk).toHaveProperty('status', 'active');
        
        verificationCode = result.share_certificate_by_pk.verification_code;
      } catch (error) {
        console.error('Error querying certificate:', error);
        throw error;
      }
    });
    
    test('should query certificates for an account', async () => {
      const getAccountCertificatesQuery = gql`
        query GetAccountCertificates($accountId: uuid!) {
          share_certificate(where: {account_id: {_eq: $accountId}}) {
            id
            certificate_number
            issue_date
            status
          }
        }
      `;
      
      const variables = {
        accountId
      };
      
      try {
        const result = await request(
          endpoint, 
          getAccountCertificatesQuery,
          variables,
          getHeaders(authToken)
        );
        
        expect(result).toHaveProperty('share_certificate');
        expect(Array.isArray(result.share_certificate)).toBe(true);
        expect(result.share_certificate.length).toBeGreaterThan(0);
        
        // Find our certificate
        const ourCertificate = result.share_certificate.find(c => c.id === certificateId);
        expect(ourCertificate).toBeDefined();
      } catch (error) {
        console.error('Error querying account certificates:', error);
        throw error;
      }
    });
  });

  describe('Certificate Verification', () => {
    test('should verify a valid certificate', async () => {
      const verifyCertificateMutation = gql`
        mutation VerifyCertificate($input: VerifyCertificateInput!) {
          verifyCertificate(input: $input) {
            isValid
            message
            certificate {
              certificate_number
              issue_date
              status
            }
          }
        }
      `;
      
      const verifyVariables = {
        input: {
          certificateNumber,
          verificationCode
        }
      };
      
      try {
        const result = await request(
          endpoint, 
          verifyCertificateMutation, 
          verifyVariables
        ); // No auth token needed for public verification
        
        expect(result).toHaveProperty('verifyCertificate');
        expect(result.verifyCertificate).toHaveProperty('isValid', true);
        expect(result.verifyCertificate).toHaveProperty('message', 'Certificate is valid');
        expect(result.verifyCertificate).toHaveProperty('certificate');
        expect(result.verifyCertificate.certificate).toHaveProperty('certificate_number', certificateNumber);
      } catch (error) {
        console.error('Error verifying certificate:', error);
        throw error;
      }
    });
    
    test('should reject invalid verification code', async () => {
      const verifyCertificateMutation = gql`
        mutation VerifyCertificate($input: VerifyCertificateInput!) {
          verifyCertificate(input: $input) {
            isValid
            message
          }
        }
      `;
      
      const verifyVariables = {
        input: {
          certificateNumber,
          verificationCode: 'INVALIDCODE'
        }
      };
      
      try {
        const result = await request(
          endpoint, 
          verifyCertificateMutation, 
          verifyVariables
        );
        
        expect(result).toHaveProperty('verifyCertificate');
        expect(result.verifyCertificate).toHaveProperty('isValid', false);
        expect(result.verifyCertificate).toHaveProperty('message', 'Certificate not found or verification code is incorrect');
      } catch (error) {
        console.error('Error testing invalid verification:', error);
        throw error;
      }
    });
  });

  describe('Certificate Lifecycle', () => {
    test('should revoke a certificate', async () => {
      const revokeCertificateMutation = gql`
        mutation RevokeCertificate($input: RevokeCertificateInput!) {
          revokeCertificate(input: $input) {
            certificateId
            certificateNumber
            revocationDate
            status
          }
        }
      `;
      
      const revokeVariables = {
        input: {
          certificateId,
          revocationDate: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
          reason: 'GraphQL test revocation'
        }
      };
      
      try {
        const result = await request(
          endpoint, 
          revokeCertificateMutation, 
          revokeVariables,
          getHeaders(authToken)
        );
        
        expect(result).toHaveProperty('revokeCertificate');
        expect(result.revokeCertificate).toHaveProperty('certificateId', certificateId);
        expect(result.revokeCertificate).toHaveProperty('certificateNumber', certificateNumber);
        expect(result.revokeCertificate).toHaveProperty('status', 'revoked');
      } catch (error) {
        console.error('Error revoking certificate:', error);
        throw error;
      }
    });
    
    test('should verify that revoked certificate is now invalid', async () => {
      const verifyCertificateMutation = gql`
        mutation VerifyCertificate($input: VerifyCertificateInput!) {
          verifyCertificate(input: $input) {
            isValid
            message
            certificate {
              status
            }
          }
        }
      `;
      
      const verifyVariables = {
        input: {
          certificateNumber,
          verificationCode
        }
      };
      
      try {
        const result = await request(
          endpoint, 
          verifyCertificateMutation, 
          verifyVariables
        );
        
        expect(result).toHaveProperty('verifyCertificate');
        expect(result.verifyCertificate).toHaveProperty('isValid', false);
        expect(result.verifyCertificate.certificate).toHaveProperty('status', 'revoked');
      } catch (error) {
        console.error('Error verifying revoked certificate:', error);
        throw error;
      }
    });
    
    test('should regenerate a certificate', async () => {
      const regenerateCertificateMutation = gql`
        mutation RegenerateCertificate($input: RegenerateCertificateInput!) {
          regenerateCertificate(input: $input) {
            originalCertificateId
            newCertificateId
            newCertificateNumber
            issueDate
            status
            downloadUrl
          }
        }
      `;
      
      const regenerateVariables = {
        input: {
          certificateId,
          newIssueDate: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
          notes: 'GraphQL test regeneration'
        }
      };
      
      try {
        const result = await request(
          endpoint, 
          regenerateCertificateMutation, 
          regenerateVariables,
          getHeaders(authToken)
        );
        
        expect(result).toHaveProperty('regenerateCertificate');
        expect(result.regenerateCertificate).toHaveProperty('originalCertificateId', certificateId);
        expect(result.regenerateCertificate).toHaveProperty('newCertificateId');
        expect(result.regenerateCertificate).toHaveProperty('newCertificateNumber');
        expect(result.regenerateCertificate).toHaveProperty('status', 'active');
        
        // Update test data with the new certificate
        const oldCertificateId = certificateId;
        certificateId = result.regenerateCertificate.newCertificateId;
        certificateNumber = result.regenerateCertificate.newCertificateNumber;
      } catch (error) {
        console.error('Error regenerating certificate:', error);
        throw error;
      }
    });
  });

  describe('Batch Certificate Operations', () => {
    test('should start a batch certificate generation', async () => {
      const startBatchMutation = gql`
        mutation StartCertificateBatch($input: StartCertificateBatchInput!) {
          startCertificateBatch(input: $input) {
            batchId
            status
            totalAccounts
            message
          }
        }
      `;
      
      const batchVariables = {
        input: {
          accountIds: [accountId], // Just include our test account
          templateId,
          seriesId,
          notes: 'GraphQL test batch'
        }
      };
      
      try {
        const result = await request(
          endpoint, 
          startBatchMutation, 
          batchVariables,
          getHeaders(authToken)
        );
        
        expect(result).toHaveProperty('startCertificateBatch');
        expect(result.startCertificateBatch).toHaveProperty('batchId');
        expect(result.startCertificateBatch).toHaveProperty('status', 'pending');
        expect(result.startCertificateBatch).toHaveProperty('totalAccounts', 1);
        
        batchId = result.startCertificateBatch.batchId;
      } catch (error) {
        console.error('Error starting batch:', error);
        throw error;
      }
    });
    
    test('should query batch details', async () => {
      const getBatchQuery = gql`
        query GetCertificateBatch($batchId: uuid!) {
          share_certificate_batch_by_pk(id: $batchId) {
            id
            product_id
            template_id
            series_id
            started_date
            status
            total_certificates
            share_certificate_batch_items {
              id
              account_id
              status
              certificate_id
            }
          }
        }
      `;
      
      const variables = {
        batchId
      };
      
      try {
        const result = await request(
          endpoint, 
          getBatchQuery,
          variables,
          getHeaders(authToken)
        );
        
        expect(result).toHaveProperty('share_certificate_batch_by_pk');
        expect(result.share_certificate_batch_by_pk).toHaveProperty('id', batchId);
        expect(result.share_certificate_batch_by_pk).toHaveProperty('share_certificate_batch_items');
        expect(Array.isArray(result.share_certificate_batch_by_pk.share_certificate_batch_items)).toBe(true);
        expect(result.share_certificate_batch_by_pk.share_certificate_batch_items.length).toBe(1);
        expect(result.share_certificate_batch_by_pk.share_certificate_batch_items[0]).toHaveProperty('account_id', accountId);
      } catch (error) {
        console.error('Error querying batch:', error);
        throw error;
      }
    });
  });

  // Clean up after tests
  afterAll(async () => {
    // No cleanup needed as we're using existing test database
  });
});