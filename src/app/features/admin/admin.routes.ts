import { Routes } from '@angular/router';
import { roleGuard } from '../../core/routing/role.guard';
import { UserRole } from '../../core/config/app.constants';
import { AdminDashboardComponent } from './pages/dashboard/admin-dashboard.component';
import { AdminCampusComponent } from './pages/campus/admin-campus.component';
import { AdminStudentComponent } from './pages/student/admin-student.component';
import { AdminCompanyComponent } from './pages/company/admin-company.component';
import { AdminNewsComponent } from './pages/news/admin-news.component';
import { AdminAppComponent } from './pages/app/admin-app.component';

/**
 * Child routes under `/admin` (parent route remains in app.routes.ts for guards/layout).
 */
export const adminRoutes: Routes = [
  {
    path: 'dashboard',
    component: AdminDashboardComponent,
    canMatch: [roleGuard],
    data: { requiredRoles: ['ADMIN', 'SUPER_ADMIN'] satisfies UserRole[] },
  },
  {
    path: 'campus',
    component: AdminCampusComponent,
    canMatch: [roleGuard],
    data: { requiredRoles: ['ADMIN', 'SUPER_ADMIN'] satisfies UserRole[] },
  },
  {
    path: 'student',
    component: AdminStudentComponent,
    canMatch: [roleGuard],
    data: { requiredRoles: ['ADMIN', 'SUPER_ADMIN'] satisfies UserRole[] },
  },
  {
    path: 'company',
    component: AdminCompanyComponent,
    canMatch: [roleGuard],
    data: { requiredRoles: ['ADMIN', 'SUPER_ADMIN'] satisfies UserRole[] },
  },
  {
    path: 'news',
    component: AdminNewsComponent,
    canMatch: [roleGuard],
    data: { requiredRoles: ['ADMIN', 'SUPER_ADMIN'] satisfies UserRole[] },
  },
  {
    path: 'app',
    component: AdminAppComponent,
    canMatch: [roleGuard],
    data: { requiredRoles: ['SUPER_ADMIN'] satisfies UserRole[] },
  },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
];


