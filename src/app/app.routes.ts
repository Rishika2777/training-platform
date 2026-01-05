import { Routes } from '@angular/router';
import { authGuard } from './core/routing/auth.guard';
import { roleGuard } from './core/routing/role.guard';
import { UserRole } from './core/config/app.constants';

import { landingRoutes } from './features/landing/landing.routes';
import { authRoutes } from './features/auth/auth.routes';
import { registrationRoutes } from './features/registration/registration.routes';
import { DashboardLayoutComponent } from './layout/dashboard-layout/dashboard-layout.component';
import { AdminLayoutComponent } from './layout/admin-layout/admin-layout.component';

import { adminRoutes } from './features/admin/admin.routes';

import { campusRoutes } from './features/campus/campus.routes';

import { studentRoutes } from './features/student/student.routes';

import { companyRoutes } from './features/company/company.routes';

interface RouteData {
  requiredRoles?: UserRole[];
}

export const routes: Routes = [
  // Landing feature owns the root route definition
  ...landingRoutes,
  ...authRoutes,
  ...registrationRoutes,

  // Admin area (ADMIN/SUPER_ADMIN)
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canMatch: [authGuard, roleGuard],
    data: { requiredRoles: ['ADMIN', 'SUPER_ADMIN'] satisfies UserRole[] } satisfies RouteData,
    children: adminRoutes,
  },

  // Campus
  {
    path: 'campus',
    component: DashboardLayoutComponent,
    canMatch: [authGuard, roleGuard],
    data: { requiredRoles: ['CAMPUS_ADMIN'] satisfies UserRole[] } satisfies RouteData,
    children: campusRoutes,
  },

  // Student
  {
    path: 'student',
    component: DashboardLayoutComponent,
    canMatch: [authGuard, roleGuard],
    data: { requiredRoles: ['STUDENT'] satisfies UserRole[] } satisfies RouteData,
    children: studentRoutes,
  },

  // Company
  {
    path: 'company',
    component: DashboardLayoutComponent,
    canMatch: [authGuard, roleGuard],
    data: { requiredRoles: ['COMPANY_ADMIN'] satisfies UserRole[] } satisfies RouteData,
    children: companyRoutes,
  },

  // fallback
  { path: '**', redirectTo: '' },
];
