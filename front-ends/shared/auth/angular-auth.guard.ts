/**
 * Angular Auth Guard
 * Protects routes from unauthorized access
 */

import { Injectable } from '@angular/core';
import { 
  CanActivate, 
  CanActivateChild, 
  CanLoad,
  Route, 
  UrlSegment, 
  ActivatedRouteSnapshot,
  RouterStateSnapshot, 
  Router
} from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';

import { AngularAuthService } from './angular-auth-service';

/**
 * Authentication Guard for Angular routes
 * Prevents unauthorized access to protected routes
 */
@Injectable()
export class AuthGuard implements CanActivate, CanActivateChild, CanLoad {
  constructor(
    private authService: AngularAuthService,
    private router: Router
  ) {}

  /**
   * Check if the user can activate a route
   */
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.checkAuth(state.url);
  }

  /**
   * Check if the user can activate a child route
   */
  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.checkAuth(state.url);
  }

  /**
   * Check if the user can load a module
   */
  canLoad(
    route: Route,
    segments: UrlSegment[]
  ): Observable<boolean> | Promise<boolean> | boolean {
    const url = segments.map(segment => `/${segment.path}`).join('');
    return this.checkAuth(url);
  }

  /**
   * Check if the user is authenticated
   * If not, redirect to login page
   */
  private checkAuth(url: string): Observable<boolean> | boolean {
    // For direct boolean check
    if (this.authService.isAuthenticated()) {
      // Check if 2FA is required but not completed
      if (this.authService.getState().isTwoFactorRequired) {
        this.router.navigate(['/login'], { 
          queryParams: { 
            returnUrl: url,
            twoFactor: true
          }
        });
        return false;
      }
      
      // Check if password reset is required
      if (this.authService.getState().isPasswordExpired) {
        this.router.navigate(['/login'], { 
          queryParams: { 
            returnUrl: url,
            resetPassword: true
          }
        });
        return false;
      }
      
      return true;
    }

    // For observable subscription
    return this.authService.authState$.pipe(
      take(1),
      map(state => {
        const isAuth = state.status === 'authenticated' && 
                       !state.isTwoFactorRequired && 
                       !state.isPasswordExpired;
        
        if (!isAuth) {
          // Store the attempted URL for redirecting
          const queryParams: any = { returnUrl: url };
          
          // Add flags for 2FA or password reset if needed
          if (state.isTwoFactorRequired) {
            queryParams.twoFactor = true;
          } else if (state.isPasswordExpired) {
            queryParams.resetPassword = true;
          }
          
          this.router.navigate(['/login'], { queryParams });
        }
        
        return isAuth;
      })
    );
  }
}