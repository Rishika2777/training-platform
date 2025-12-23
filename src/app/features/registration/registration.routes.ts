import { Routes } from '@angular/router';
import { authPagesGuard } from '../../core/routing/auth-pages.guard';
import { RegisterComponent } from './pages/register/register.component';
import { RegisterOptionsComponent } from './pages/register-options/register-options.component';
import { RegisterCampusComponent } from './pages/register-campus/register-campus.component';
import { RegisterStudentComponent } from './pages/register-student/register-student.component';
import { RegisterCompanyComponent } from './pages/register-company/register-company.component';

export const registrationRoutes: Routes = [
  { path: 'register', component: RegisterComponent, canMatch: [authPagesGuard] },
  { path: 'register-options', component: RegisterOptionsComponent, canMatch: [authPagesGuard] },
  { path: 'register-campus', component: RegisterCampusComponent, canMatch: [authPagesGuard] },
  { path: 'register-student', component: RegisterStudentComponent, canMatch: [authPagesGuard] },
  { path: 'register-company', component: RegisterCompanyComponent, canMatch: [authPagesGuard] },
];



