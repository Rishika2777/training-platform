import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { ResetPasswordComponent } from './pages/reset-password/reset-password.component';

export const authRoutes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'reset-password/:userId', component: ResetPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
];



