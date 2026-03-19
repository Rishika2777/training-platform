import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  CompanyFormComponent,
  CompanyFormValue,
} from '../../../../shared/components/forms/company-form/company-form.component';
import { RegistrationPageLayoutComponent } from '../../../../layout/registration-page-layout/registration-page-layout.component';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { AuthStateService } from '../../../../core/auth/auth-state.service';
import { StorageService } from '../../../../core/storage/storage.service';
import { LOGIN_STATUS, STORAGE_KEYS } from '../../../../core/config/app.constants';
import { RegistrationStateService } from '../../services/registration-state.service';
import {
  CompanyApiService,
  CompanyRegisterFiles,
  CompanyRegisterPayload,
  CompanyRegisterRequest,
  CompanyRegistrationResponse,
  KeyPersonRequest,
} from '../../../company/services/company-api.service';

@Component({
  selector: 'app-register-company',
  standalone: true,
  imports: [CommonModule, CompanyFormComponent, RegistrationPageLayoutComponent],
  templateUrl: './register-company.component.html',
  styleUrl: './register-company.component.css',
})
export class RegisterCompanyComponent {
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);
  private readonly auth = inject(AuthService);
  private readonly authState = inject(AuthStateService);
  private readonly storage = inject(StorageService);
  private readonly companyApi = inject(CompanyApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly registrationState = inject(RegistrationStateService);

  private readonly initialAdminEmail =
    this.auth.getCurrentUser()?.email ?? this.registrationState.getDraft()?.email ?? '';

  readonly adminEmailLocked = this.initialAdminEmail.trim().length > 0;

  formValue: CompanyFormValue = {
    ...CompanyFormComponent.createEmptyValue(),
    adminEmail: this.initialAdminEmail,
  };
  submitting = false;
  searchValue = '';

  handleSearch(term: string): void {
    const trimmed = term.trim();
    if (!trimmed) {
      return;
    }
    this.notify.info('Search is not implemented yet.');
  }

  submit(value: CompanyFormValue): void {
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
    this.companyApi
      .registerCompany(
        this.buildRegisterPayload(value),
        { userId: user.userId, userType: user.userType },
      )
      .subscribe({
        next: (response: CompanyRegistrationResponse | null) => {
          this.submitting = false;

          const companyId = response?.companyId ?? null;
          const approvalStatus = response?.approvalStatus ?? null;

          if (companyId) {
            this.storage.set(STORAGE_KEYS.COMPANY_ID, companyId);
            const current = this.authState.user();
            if (current && !current.profileServiceId) {
              this.authState.setUser({ ...current, profileServiceId: companyId });
            }
          }

          if (approvalStatus === 'PENDING' || approvalStatus === LOGIN_STATUS.PENDING_APPROVAL) {
            this.notify.success(
              'You have successfully submitted the form, please wait until admin review and approve your form',
            );
            void this.router.navigateByUrl('/login');
            return;
          }

          if (approvalStatus === LOGIN_STATUS.PENDING_REGISTRATION) {
            void this.router.navigateByUrl('/register/company');
            return;
          }

          if (approvalStatus === LOGIN_STATUS.REJECTED) {
            this.notify.error('The admin rejected your form. Please contact admin for more information.');
            return;
          }

          this.notify.success('Company profile created successfully.');
          void this.router.navigateByUrl('/company/home');
        },
        error: () => {
          this.submitting = false;
          this.cdr.detectChanges();
        },
      });
  }

  private buildRegisterPayload(value: CompanyFormValue): CompanyRegisterPayload {
    return {
      request: this.buildRegisterRequest(value),
      files: this.buildRegisterFiles(value),
    };
  }

  private buildRegisterRequest(value: CompanyFormValue): CompanyRegisterRequest {
    return {
      companyName: value.companyName,
      companyLogoUrl: this.fileNameOrEmpty(value.companyPhoto),
      adminName: value.adminName,
      adminDesignation: value.adminDesignation,
      adminEmail: value.adminEmail.toLowerCase(),
      adminPhone: value.adminPhone,
      websiteUrl: value.companyWebsiteUrl,
      otherWebsiteUrl: value.otherWebsiteUrl,
      registerNumber: value.registerNumber,
      keyPeople: this.mapKeyPeople(value.keyPeople),
      aboutCompany: value.aboutCompany,
      companyAddress: value.companyAddress,
    };
  }

  private buildRegisterFiles(value: CompanyFormValue): CompanyRegisterFiles {
    const keyPersonPhotos = value.keyPeople.map((person) => person.photo);
    return {
      companyLogo: value.companyPhoto,
      keyPerson1Photo: keyPersonPhotos[0] ?? null,
      keyPerson2Photo: keyPersonPhotos[1] ?? null,
      keyPerson3Photo: keyPersonPhotos[2] ?? null,
    };
  }

  private mapKeyPeople(values: readonly { name: string; designation: string; photo: File | null }[]): KeyPersonRequest[] {
    return values.map((p) => ({
      name: p.name,
      designation: p.designation,
      photoUrl: this.fileNameOrEmpty(p.photo),
    }));
  }

  private fileNameOrEmpty(file: File | null): string {
    return file?.name ?? '';
  }

  cancel(): void {
    // TODO: decide navigation target
    void this.router.navigateByUrl('/register/options');
  }
}


