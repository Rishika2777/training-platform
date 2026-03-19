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
import { departmentRoutes } from './features/campus/department.routes';

import { studentRoutes } from './features/student/student.routes';
import { StudentProfileComponent } from './features/student/pages/profile/student-profile.component';
import { CompanyAboutComponent } from './features/company/pages/about/company-about.component';
import { CampusAboutComponent } from './features/campus/pages/about/campus-about.component';

import { companyRoutes } from './features/company/company.routes';

interface RouteData {
  requiredRoles?: UserRole[];
}

export const routes: Routes = [
  // Landing feature owns the root route definition
  ...landingRoutes,
  ...authRoutes,
  ...registrationRoutes,

  { path: 'profile/student/:publicStudentId', component: StudentProfileComponent },
  { path: 'profile/company/:publicCompanyId', component: CompanyAboutComponent },
  { path: 'profile/campus/:publicCampusId', component: CampusAboutComponent },

  // Admin area (ADMIN/SUPER_ADMIN)
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canMatch: [authGuard, roleGuard],
    data: { requiredRoles: ['ADMIN', 'SUPER_ADMIN'] satisfies UserRole[] } satisfies RouteData,
    children: adminRoutes,
  },

  // Campus (CAMPUS_ADMIN only)
  {
    path: 'campus',
    component: DashboardLayoutComponent,
    canMatch: [authGuard, roleGuard],
    data: { requiredRoles: ['CAMPUS_ADMIN'] satisfies UserRole[] } satisfies RouteData,
    children: campusRoutes,
  },

  // Department (DEPARTMENT user type - same content as campus, different URL)
  {
    path: 'department',
    component: DashboardLayoutComponent,
    canMatch: [authGuard, roleGuard],
    data: { requiredRoles: ['DEPARTMENT'] satisfies UserRole[] } satisfies RouteData,
    children: departmentRoutes,
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
