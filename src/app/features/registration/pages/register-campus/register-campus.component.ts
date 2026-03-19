import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  CampusFormComponent,
  CampusFormValue,
} from '../../../../shared/components/forms/campus-form/campus-form.component';
import { CampusApiService } from '../../../campus/services/campus-api.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { AuthStateService } from '../../../../core/auth/auth-state.service';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { StorageService } from '../../../../core/storage/storage.service';
import { LOGIN_STATUS, STORAGE_KEYS } from '../../../../core/config/app.constants';
import { CampusRegistrationResponse } from '../../../campus/services/campus-api.service';
import { RegistrationPageLayoutComponent } from '../../../../layout/registration-page-layout/registration-page-layout.component';
import { RegistrationStateService } from '../../services/registration-state.service';

@Component({
  selector: 'app-register-campus',
  standalone: true,
  imports: [CommonModule, CampusFormComponent, RegistrationPageLayoutComponent],
  templateUrl: './register-campus.component.html',
  styleUrl: './register-campus.component.css',
})
export class RegisterCampusComponent {
  private readonly campusApi = inject(CampusApiService);
  private readonly auth = inject(AuthService);
  private readonly authState = inject(AuthStateService);
  private readonly storage = inject(StorageService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly registrationState = inject(RegistrationStateService);

  submitting = false;
  searchValue = '';

  private readonly initialAdminEmail =
    this.auth.getCurrentUser()?.email ?? this.registrationState.getDraft()?.email ?? '';

  readonly adminEmailLocked = this.initialAdminEmail.trim().length > 0;

  formValue: CampusFormValue = {
    campusName: '',
    campusLogoUrl: '',
    campusLogoFiles: null,
    rank: '',
    adminName: '',
    adminEmail: this.initialAdminEmail,
    adminPhone: '',
    adminDept: '',
    adminDesignation: '',
    website: '',
    about: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  };

  handleSearch(value: string): void {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    this.notify.info('Search is not implemented yet.');
  }

  submit(value: CampusFormValue): void {
    if (this.submitting) {
      return;
    }
    const user = this.auth.getCurrentUser();
    if (!user?.userId || !user.userType) {
      this.notify.error('Missing auth context. Please sign in and try again.');
      void this.router.navigateByUrl('/login');
      return;
    }

    this.submitting = true;
    const photo = value.campusLogoFiles?.length ? value.campusLogoFiles[0] : null;
    this.campusApi
      .registerCampus(
        {
          campusName: value.campusName,
          campusLogoUrl: value.campusLogoUrl,
          campusRank: Number.parseInt(value.rank || '0', 10) || 0,
          adminName: value.adminName,
          adminEmail: value.adminEmail.toLowerCase(),
          adminPhone: value.adminPhone,
          adminDepartment: value.adminDept,
          adminDesignation: value.adminDesignation,
          websiteUrl: value.website,
          aboutCampus: value.about,
          campusAddress: value.address,
        },
        { userId: user.userId, userType: user.userType },
        photo,
      )
      .subscribe({
        next: (response: CampusRegistrationResponse | null) => {
          this.submitting = false;

          const campusId = response?.campusId ?? null;
          const approvalStatus = response?.approvalStatus ?? null;

          if (campusId) {
            this.storage.set(STORAGE_KEYS.CAMPUS_ID, campusId);
            const current = this.authState.user();
            if (current && !current.profileServiceId) {
              this.authState.setUser({ ...current, profileServiceId: campusId });
            }
          }

          // Pending approval: show wait message.
          // Backend may return "PENDING" or "PENDING_APPROVAL". Treat both as pending approval.
          if (approvalStatus === 'PENDING' || approvalStatus === LOGIN_STATUS.PENDING_APPROVAL) {
            this.notify.success(
              'You have successfully submitted the form, please wait until admin review and approves your form',
            );
            void this.router.navigateByUrl('/login');
            return;
          }

          // If backend says pending registration, fallback to this registration page.
          if (approvalStatus === LOGIN_STATUS.PENDING_REGISTRATION) {
            void this.router.navigateByUrl('/register/campus');
            return;
          }

          if (approvalStatus === LOGIN_STATUS.REJECTED) {
            this.notify.error('The admin rejected your form. Please contact admin for more information.');
            return;
          }

          // Approved (or unknown): proceed to home.
          this.notify.success('Campus profile created successfully.');
          void this.router.navigateByUrl('/campus/home');
        },
        error: () => {
          this.submitting = false;
          this.cdr.detectChanges();
        },
      });
  }

  cancel(): void {
    if (this.submitting) {
      return;
    }
    void this.router.navigateByUrl('/register/options');
  }
}


