import { CanMatchFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { LOGIN_STATUS } from '../config/app.constants';
import { RegistrationStateService } from '../../features/registration/services/registration-state.service';
import { RoleService } from '../rbac/role.service';

export const registrationFlowGuard: CanMatchFn = () => {
  const registrationState = inject(RegistrationStateService);
  const roles = inject(RoleService);
  const router = inject(Router);

  // 1. Login flow: user with PENDING_REGISTRATION (no draft from login)
  const user = roles.getCurrentUser();
  if (user?.approvalStatus === LOGIN_STATUS.PENDING_REGISTRATION && user?.userType) {
    return true;
  }

  // 2. Registration flow: user has draft from register → options
  if (registrationState.getDraft()) {
    return true;
  }

  return router.parseUrl('/register');
};
