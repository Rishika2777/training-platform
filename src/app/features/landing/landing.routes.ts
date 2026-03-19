import { Routes } from '@angular/router';
import { LandingComponent } from './pages/landing/landing.component';

/**
 * Landing feature routes (legacy-equivalent).
 * Root path shows landing when logged out; redirects to role home when logged in.
 */
export const landingRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: LandingComponent,
  },
];


