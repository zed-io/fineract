/**
 * Angular Authentication Module
 * Makes it easy to integrate shared authentication in Angular applications
 */

import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HTTP_INTERCEPTORS } from '@angular/common/http';

import { 
  AngularAuthService, 
  STORAGE_TOKEN, 
  SESSION_STORAGE_TOKEN,
  AUTH_CONFIG_TOKEN,
  BrowserStorage 
} from './angular-auth-service';
import { AuthConfig } from './auth-service';
import { AuthInterceptor } from './angular-auth.interceptor';
import { AuthGuard } from './angular-auth.guard';

/**
 * Angular Authentication Module
 * Provides authentication services for Angular applications
 */
@NgModule({
  imports: [
    CommonModule
  ],
  providers: [
    AngularAuthService,
    AuthGuard,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ]
})
export class FineractAuthModule {
  /**
   * Configure the authentication module
   * @param config Authentication configuration
   */
  static forRoot(config: AuthConfig): ModuleWithProviders<FineractAuthModule> {
    return {
      ngModule: FineractAuthModule,
      providers: [
        {
          provide: AUTH_CONFIG_TOKEN,
          useValue: config
        },
        {
          provide: STORAGE_TOKEN,
          useFactory: () => new BrowserStorage(localStorage)
        },
        {
          provide: SESSION_STORAGE_TOKEN,
          useFactory: () => new BrowserStorage(sessionStorage)
        }
      ]
    };
  }
}