import { Routes } from '@angular/router';
import { CampusHomeComponent } from './pages/home/campus-home.component';
import { CampusAboutComponent } from './pages/about/campus-about.component';

/**
 * Child routes under `/campus` (parent route remains in app.routes.ts for guards/layout).
 * Only 'about' has a route - other modals open without routing.
 */
export const campusRoutes: Routes = [
  { path: 'home', component: CampusHomeComponent },
  { path: 'about', component: CampusAboutComponent },
  { path: 'about/:campusId/:userId', component: CampusAboutComponent },
];


