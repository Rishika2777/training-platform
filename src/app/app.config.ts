import { ApplicationConfig, importProvidersFrom, provideBrowserGlobalErrorListeners, APP_INITIALIZER, PLATFORM_ID } from '@angular/core';
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
    importProvidersFrom(
      ToastrModule.forRoot({
        positionClass: 'toast-top-right',
        timeOut: 3000,
        preventDuplicates: true,
        closeButton: true,
        progressBar: true,
      }),
    ),
  ],
};
