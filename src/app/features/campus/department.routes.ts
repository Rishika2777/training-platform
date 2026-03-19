import { Routes } from '@angular/router';
import { CampusHomeComponent } from './pages/home/campus-home.component';
import { CampusAboutComponent } from './pages/about/campus-about.component';

/**
 * Child routes under `/department` for DEPARTMENT user type.
 * Reuses campus components (home, about) with department URL.
 */
export const departmentRoutes: Routes = [
  { path: 'home', component: CampusHomeComponent },
  { path: 'about', component: CampusAboutComponent },
  { path: 'about/:campusId/:userId', component: CampusAboutComponent },
];
