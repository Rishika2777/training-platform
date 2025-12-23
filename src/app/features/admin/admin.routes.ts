import { Routes } from '@angular/router';
import { AdminDashboardComponent } from './pages/dashboard/admin-dashboard.component';
import { AdminCampusComponent } from './pages/campus/admin-campus.component';
import { AdminStudentComponent } from './pages/student/admin-student.component';
import { AdminCompanyComponent } from './pages/company/admin-company.component';
import { AdminAppComponent } from './pages/app/admin-app.component';

/**
 * Child routes under `/admin` (parent route remains in app.routes.ts for guards/layout).
 */
export const adminRoutes: Routes = [
  { path: 'dashboard', component: AdminDashboardComponent },
  { path: 'campus', component: AdminCampusComponent },
  { path: 'student', component: AdminStudentComponent },
  { path: 'company', component: AdminCompanyComponent },
  { path: 'app', component: AdminAppComponent },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
];


