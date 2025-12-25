import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
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
import { STORAGE_KEYS } from '../../../../core/config/app.constants';
import { catchError, map, of, switchMap } from 'rxjs';
import { RegistrationPageLayoutComponent } from '../../../../layout/registration-page-layout/registration-page-layout.component';

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

  submitting = false;
  searchValue = '';

  formValue: CampusFormValue = {
    campusName: '',
    campusLogoUrl: '',
    campusLogoFiles: null,
    rank: '',
    adminName: '',
    adminEmail: '',
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
    this.campusApi
      .registerCampus(
        {
          campusName: value.campusName,
          campusLogoUrl: value.campusLogoUrl,
          rank: value.rank,
          adminName: value.adminName,
          adminEmail: value.adminEmail,
          adminPhone: value.adminPhone,
          adminDept: value.adminDept,
          adminDesignation: value.adminDesignation,
          website: value.website,
          about: value.about,
          address: value.address,
          city: value.city,
          state: value.state,
          pincode: value.pincode,
        },
        { userId: user.userId, userType: user.userType },
      )
      .pipe(
        switchMap((result) => {
          const campusId = result.campusId;
          if (!campusId) {
            return of(null);
          }

          this.storage.set(STORAGE_KEYS.CAMPUS_ID, campusId);
          const current = this.authState.user();
          if (current && !current.profileServiceId) {
            this.authState.setUser({ ...current, profileServiceId: campusId });
          }

          return this.auth.completeProfile(campusId).pipe(
            map(() => campusId),
            catchError(() => of(campusId)),
          );
        }),
      )
      .subscribe({
        next: (campusId) => {
          this.submitting = false;
          if (!campusId) {
            this.notify.success('Saved.');
            void this.router.navigateByUrl('/campus/home');
            return;
          }
          this.notify.success('Campus profile created successfully.');
          void this.router.navigateByUrl('/campus/home');
        },
        error: () => {
          this.submitting = false;
        },
      });
  }

  cancel(): void {
    if (this.submitting) {
      return;
    }
    void this.router.navigateByUrl('/register-options');
  }
}


