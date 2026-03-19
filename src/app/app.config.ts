import { ApplicationConfig, importProvidersFrom, provideBrowserGlobalErrorListeners, APP_INITIALIZER, PLATFORM_ID, isDevMode } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ToastrModule } from 'ngx-toastr';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { authInterceptor } from './core/auth/auth.interceptor';
import { httpErrorInterceptor } from './core/http/http-error.interceptor';
import { API_ENDPOINTS, API_ENDPOINTS_TOKEN, APP_CONFIG_TOKEN } from './core/config/app.constants';
import { resolveAppConfig } from './core/config/runtime-config';
import { createAuthInitializer } from './core/auth/auth.initializer';
import { AuthStateService } from './core/auth/auth-state.service';
import { provideServiceWorker } from '@angular/service-worker';

/** Browsers block service workers on HTTP (non-localhost). Only HTTPS or localhost is allowed. */
const isSecureContext = typeof window !== 'undefined' && window.isSecureContext;

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideAnimations(),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, httpErrorInterceptor])),
    { provide: APP_CONFIG_TOKEN, useFactory: resolveAppConfig },
    { provide: API_ENDPOINTS_TOKEN, useValue: API_ENDPOINTS },
    {
      provide: APP_INITIALIZER,
      useFactory: createAuthInitializer,
      deps: [PLATFORM_ID, Router, AuthStateService],
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: () => () => {
        if (!isDevMode() && typeof window !== 'undefined' && !window.isSecureContext) {
          console.warn(
            '[Synkup] Service worker disabled: PWA requires HTTPS (or localhost). Current URL is HTTP and not localhost. Deploy with HTTPS to enable offline support.',
          );
        }
      },
      multi: true,
    },
    importProvidersFrom(
      ToastrModule.forRoot({
        positionClass: 'toast-top-right',
        timeOut: 3000,
        preventDuplicates: true,
        closeButton: true,
        progressBar: true,
      }),
    ),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode() && isSecureContext,
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
