import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { LOGIN_STATUS } from '../../../core/config/app.constants';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationService } from '../../../core/notifications/notification.service';
import { RoleService } from '../../../core/rbac/role.service';

type OtpDecision =
  | { needsOtp: true; email: string }
  | { needsOtp: false };

@Injectable({ providedIn: 'root' })
export class AuthFacadeService {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly roles = inject(RoleService);
  private readonly notifications = inject(NotificationService);

  getOtpDecisionFromResponse(response: unknown): OtpDecision {
    const emailVerified = this.auth.extractEmailVerified(response);
    const email = this.auth.extractEmailFromResponse(response);
    if (emailVerified === false && email) {
      return { needsOtp: true, email: email.toLowerCase() };
    }
    return { needsOtp: false };
  }

  getOtpDecisionFromError(err: unknown): OtpDecision | null {
    if (!(err instanceof HttpErrorResponse)) {
      return null;
    }
    const errorResponse = err.error;
    if (!errorResponse || typeof errorResponse !== 'object') {
      return null;
    }
    const emailVerified = this.auth.extractEmailVerified(errorResponse);
    const email = this.auth.extractEmailFromResponse(errorResponse);
    if (emailVerified === false && email) {
      return { needsOtp: true, email: email.toLowerCase() };
    }
    return null;
  }

  navigateAfterLogin(): void {
    const user = this.roles.getCurrentUser();
    if (!user) {
      return;
    }

    // Skip approval status checks for admin users
    if (this.roles.isAdmin()) {
      void this.router.navigateByUrl(this.roles.getHomeRouteForUser());
      return;
    }

    const approvalStatus = user.approvalStatus;
    const userType = user.userType ?? null;

    if (approvalStatus === LOGIN_STATUS.PENDING_REGISTRATION) {
      const registrationRoute = this.roles.getRegistrationRouteForUserType(userType);
      void this.router.navigateByUrl(registrationRoute);
      return;
    }

    if (approvalStatus === LOGIN_STATUS.PENDING_APPROVAL) {
      this.notifications.info('Admin still haven\'t reviewed your form. Please wait for approval.');
      return;
    }

    if (approvalStatus === LOGIN_STATUS.APPROVED) {
      void this.router.navigateByUrl(this.roles.getHomeRouteForUser());
      return;
    }

    if (approvalStatus === LOGIN_STATUS.REJECTED) {
      this.notifications.error('The admin rejected your form. Please contact admin for more information.');
      return;
    }

    // Fallback: if no approval status, navigate to home (for backward compatibility)
    void this.router.navigateByUrl(this.roles.getHomeRouteForUser());
  }
}

