/**
 * Shared REST API client for making HTTP requests
 * This is a framework-agnostic implementation that can be used by both Angular and React
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface RequestOptions {
  /** HTTP headers to include with the request */
  headers?: Record<string, string>;
  
  /** URL query parameters */
  params?: Record<string, string | number | boolean | undefined | null>;
  
  /** Request timeout in milliseconds */
  timeout?: number;
  
  /** Whether to include credentials (cookies) with the request */
  withCredentials?: boolean;
  
  /** Whether to handle errors internally or throw them */
  handleErrors?: boolean;
  
  /** Whether to automatically parse the response as JSON */
  parseJson?: boolean;
  
  /** Function to transform the response before returning */
  responseTransformer?: (response: any) => any;
  
  /** Function to transform the request data before sending */
  requestTransformer?: (data: any) => any;
  
  /** Content type header value */
  contentType?: string;
  
  /** Accept header value */
  accept?: string;
  
  /** Function to handle request cancellation */
  cancelToken?: AbortController | any;
}

export interface ApiResponse<T = any> {
  /** Response data */
  data: T;
  
  /** HTTP status code */
  status: number;
  
  /** HTTP status text */
  statusText: string;
  
  /** Response headers */
  headers: Record<string, string>;
  
  /** Whether the request was successful */
  success: boolean;
  
  /** Error message (if any) */
  error?: string;
}

export interface ApiClientConfig {
  /** Base URL for all API requests */
  baseUrl: string;
  
  /** Default request options */
  defaultOptions?: RequestOptions;
  
  /** Function to get the authentication token */
  getAuthToken?: () => string | Promise<string> | null;
  
  /** Function to handle authentication errors */
  onAuthError?: (error: any) => void;
  
  /** Default timeout in milliseconds */
  defaultTimeout?: number;
  
  /** Whether to retry failed requests */
  retryFailedRequests?: boolean;
  
  /** Maximum number of retry attempts */
  maxRetryAttempts?: number;
  
  /** Whether to log requests and responses */
  enableLogging?: boolean;
}

/**
 * Create a REST API client instance
 * @param config API client configuration
 * @returns API client methods
 */
export function createApiClient(config: ApiClientConfig) {
  const {
    baseUrl,
    defaultOptions = {},
    getAuthToken,
    onAuthError,
    defaultTimeout = 30000,
    retryFailedRequests = false,
    maxRetryAttempts = 3,
    enableLogging = false
  } = config;
  
  /**
   * Log request or response if logging is enabled
   */
  const log = (type: 'request' | 'response' | 'error', data: any) => {
    if (!enableLogging) return;
    
    if (type === 'request') {
      console.log('%c API Request ', 'background: #34495e; color: white', data);
    } else if (type === 'response') {
      console.log('%c API Response ', 'background: #27ae60; color: white', data);
    } else if (type === 'error') {
      console.log('%c API Error ', 'background: #e74c3c; color: white', data);
    }
  };
  
  /**
   * Build the full request URL with query parameters
   */
  const buildUrl = (endpoint: string, params?: Record<string, any>): string => {
    // Ensure endpoint doesn't start with a slash if baseUrl ends with one
    const normalizedEndpoint = endpoint.startsWith('/') && baseUrl.endsWith('/')
      ? endpoint.slice(1)
      : endpoint;
    
    // Combine base URL and endpoint
    const url = new URL(normalizedEndpoint, baseUrl);
    
    // Add query parameters if provided
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    return url.toString();
  };
  
  /**
   * Get request headers including authentication if available
   */
  const getHeaders = async (customHeaders: Record<string, string> = {}, contentType?: string): Promise<HeadersInit> => {
    const headers: Record<string, string> = {
      'Content-Type': contentType || 'application/json',
      'Accept': 'application/json',
      ...customHeaders
    };
    
    // Add authentication token if available
    if (getAuthToken) {
      const token = await getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    
    return headers;
  };
  
  /**
   * Process the response and format it consistently
   */
  const processResponse = async <T>(response: Response, options: RequestOptions): Promise<ApiResponse<T>> => {
    const { parseJson = true, responseTransformer } = options;
    
    // Parse headers into a plain object
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    
    // Check if response is successful (status 200-299)
    const success = response.ok;
    
    let data: any;
    let error: string | undefined;
    
    try {
      // Parse response body based on content type
      if (parseJson && response.headers.get('content-type')?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }
      
      // Apply response transformer if provided
      if (responseTransformer && success) {
        data = responseTransformer(data);
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to parse response';
      data = null;
    }
    
    const result: ApiResponse<T> = {
      data,
      status: response.status,
      statusText: response.statusText,
      headers,
      success,
      error: !success ? error || response.statusText : undefined
    };
    
    // Log response if logging is enabled
    log(success ? 'response' : 'error', result);
    
    // Handle authentication errors
    if (response.status === 401 && onAuthError) {
      onAuthError(result);
    }
    
    // Throw error if handleErrors is false and response is not successful
    if (!options.handleErrors && !success) {
      throw result;
    }
    
    return result;
  };
  
  /**
   * Make an HTTP request
   */
  const request = async <T = any>(
    method: HttpMethod,
    endpoint: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> => {
    // Merge default options with provided options
    const mergedOptions: RequestOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...(defaultOptions.headers || {}),
        ...(options.headers || {})
      },
      params: {
        ...(defaultOptions.params || {}),
        ...(options.params || {})
      }
    };
    
    // Transform request data if transformer provided
    const transformedData = mergedOptions.requestTransformer ? mergedOptions.requestTransformer(data) : data;
    
    // Build full URL with query parameters
    const url = buildUrl(endpoint, mergedOptions.params);
    
    // Get headers with authentication
    const headers = await getHeaders(
      mergedOptions.headers,
      mergedOptions.contentType
    );
    
    // Create fetch options
    const fetchOptions: RequestInit = {
      method,
      headers,
      credentials: mergedOptions.withCredentials ? 'include' : 'same-origin',
      signal: mergedOptions.cancelToken instanceof AbortController 
        ? mergedOptions.cancelToken.signal 
        : mergedOptions.cancelToken
    };
    
    // Add body for methods that support it
    if (method !== 'GET' && method !== 'HEAD' && transformedData !== undefined) {
      fetchOptions.body = headers['Content-Type'] === 'application/json'
        ? JSON.stringify(transformedData)
        : transformedData;
    }
    
    // Log request if logging is enabled
    log('request', { url, method, data: transformedData, options: mergedOptions });
    
    // Set up timeout if specified
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timeoutId = setTimeout(() => {
        clearTimeout(timeoutId);
        reject(new Error(`Request timeout after ${mergedOptions.timeout || defaultTimeout}ms`));
      }, mergedOptions.timeout || defaultTimeout);
    });
    
    // Retry logic
    let retryCount = 0;
    let lastError: any;
    
    while (retryCount <= (retryFailedRequests ? maxRetryAttempts : 0)) {
      try {
        // Make the request with timeout
        const response = await Promise.race([
          fetch(url, fetchOptions),
          timeoutPromise
        ]);
        
        // Process the response
        return await processResponse<T>(response, mergedOptions);
      } catch (error) {
        lastError = error;
        
        // Only retry network errors or 5xx server errors
        if (retryFailedRequests && (
          !('status' in error) || 
          (error.status >= 500 && error.status < 600)
        )) {
          retryCount++;
          
          if (retryCount <= maxRetryAttempts) {
            // Wait with exponential backoff before retrying
            const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        // Log error if logging is enabled
        log('error', error);
        
        // Re-throw the error
        throw error;
      }
    }
    
    throw lastError;
  };
  
  // Return API client methods
  return {
    /**
     * Make a GET request
     */
    get: <T = any>(endpoint: string, options?: RequestOptions) => 
      request<T>('GET', endpoint, undefined, options),
    
    /**
     * Make a POST request
     */
    post: <T = any>(endpoint: string, data?: any, options?: RequestOptions) => 
      request<T>('POST', endpoint, data, options),
    
    /**
     * Make a PUT request
     */
    put: <T = any>(endpoint: string, data?: any, options?: RequestOptions) => 
      request<T>('PUT', endpoint, data, options),
    
    /**
     * Make a DELETE request
     */
    delete: <T = any>(endpoint: string, data?: any, options?: RequestOptions) => 
      request<T>('DELETE', endpoint, data, options),
    
    /**
     * Make a PATCH request
     */
    patch: <T = any>(endpoint: string, data?: any, options?: RequestOptions) => 
      request<T>('PATCH', endpoint, data, options),
    
    /**
     * Create a cancel token for request cancellation
     */
    createCancelToken: () => new AbortController(),
    
    /**
     * Cancel a request using a cancel token
     */
    cancelRequest: (cancelToken: AbortController) => cancelToken.abort(),
  };
}