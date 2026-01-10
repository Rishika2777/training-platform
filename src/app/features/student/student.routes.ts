import { Routes } from '@angular/router';
import { StudentHomeComponent } from './pages/home/student-home.component';
import { StudentProfileComponent } from './pages/profile/student-profile.component';

/**
 * Child routes under `/student` (parent route remains in app.routes.ts for guards/layout).
 */
export const studentRoutes: Routes = [
  { path: 'home', component: StudentHomeComponent },
  { path: 'profile', component: StudentProfileComponent },
  { path: 'profile/:studentId/:userId', component: StudentProfileComponent },
];


