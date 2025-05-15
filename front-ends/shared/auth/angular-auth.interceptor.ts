/**
 * Angular Auth Interceptor
 * Automatically adds authentication headers to HTTP requests
 */

import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { AngularAuthService } from './angular-auth-service';

/**
 * Authentication Interceptor for Angular HTTP requests
 * Automatically adds authentication headers and handles token refresh
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AngularAuthService) {}

  /**
   * Intercept HTTP requests to add authentication headers
   */
  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Skip authentication for auth endpoints
    if (this.isAuthEndpoint(request.url)) {
      return next.handle(request);
    }

    // Add auth headers to the request
    const authHeaders = this.authService.getAuthHeaders();
    let authReq = request;
    
    if (Object.keys(authHeaders).length > 0) {
      authReq = request.clone({
        setHeaders: authHeaders
      });
    }

    // Handle the request with auto token refresh on 401 errors
    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // Check if error is due to expired token
        if (error.status === 401 && this.authService.isAuthenticated()) {
          // Try to refresh the token
          return this.handleTokenRefresh(request, next);
        }
        
        // Propagate the error
        return throwError(() => error);
      })
    );
  }

  /**
   * Handle token refresh and retry the request
   */
  private handleTokenRefresh(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return new Observable(observer => {
      // Try to refresh the token
      this.authService.refreshToken()
        .then(token => {
          if (token) {
            // Token refresh succeeded, retry the request with new headers
            const authHeaders = this.authService.getAuthHeaders();
            const authReq = request.clone({
              setHeaders: authHeaders
            });
            
            // Handle the request
            next.handle(authReq).subscribe({
              next: (event) => observer.next(event),
              error: (error) => observer.error(error),
              complete: () => observer.complete()
            });
          } else {
            // Token refresh failed, propagate the original error
            observer.error(new HttpErrorResponse({
              status: 401,
              statusText: 'Unauthorized',
              error: 'Token refresh failed'
            }));
          }
        })
        .catch(error => {
          // Token refresh failed, propagate the error
          observer.error(error);
        });
    });
  }

  /**
   * Check if the URL is an authentication endpoint
   * These endpoints don't need authentication headers
   */
  private isAuthEndpoint(url: string): boolean {
    const authEndpoints = [
      '/authentication',
      '/oauth/token',
      '/login',
      '/logout',
      '/refresh-token'
    ];
    
    return authEndpoints.some(endpoint => url.includes(endpoint));
  }
}