import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, inject, signal, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../../../../core/auth/auth.service';
import { RoleService } from '../../../../core/rbac/role.service';
import { StorageService } from '../../../../core/storage/storage.service';
import { STORAGE_KEYS } from '../../../../core/config/app.constants';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from 'firebase/auth';
import { getFirebaseAuth, formatPhoneNumber } from '../../../../core/firebase/firebase-utils';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { InputComponent } from '../../../../shared/components/input/input.component';

import {
  StudentApiService,
  StudentUpdateFiles,
  StudentUpdatePayload,
} from '../../../student/services/student-api.service';
import {
  CompanyApiService,
  CompanyRegisterFiles,
  CompanyRegisterPayload,
  CompanyRegisterRequest,
  CompanyRegistrationResponse,
  KeyPersonResponse,
} from '../../../company/services/company-api.service';
import { CampusApiService, Campus, CampusProfileUpdateRequest } from '../../../campus/services/campus-api.service';
import { StudentFormComponent } from '../../../../shared/components/forms/student-form/student-form.component';
import type { StudentFormValue } from '../../../../shared/components/forms/student-form/student-form.models';
import { createEmptyStudentFormValue } from '../../../../shared/components/forms/student-form/student-form.utils';
import { CampusResponse } from '../../../student/models/student.models';
import { CompanyFormComponent, CompanyFormValue } from '../../../../shared/components/forms/company-form/company-form.component';
import { CampusFormComponent, CampusFormValue } from '../../../../shared/components/forms/campus-form/campus-form.component';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { unwrapApiResponse } from '../../../../core/api/api-response.utils';
import { UserType } from '../../../../core/config/app.constants';
import { mapStudentFormValueToRegisterRequest } from '../../../student/models/student.models';
import { DepartmentDetailService } from '../../../campus/services/department-detail.service';
import { DepartmentFormComponent, DepartmentFormValue } 
from '../../../../shared/components/forms/department-form/department-form.component';
import { UserData } from '../../../../core/models/user.model';


@Component({
  selector: 'app-edit-profile-modal',
  standalone: true,
  imports: [
    CommonModule,
    StudentFormComponent,
    CompanyFormComponent,
    CampusFormComponent,
    DepartmentFormComponent,
    ModalComponent,
    ButtonComponent,
    InputComponent,
  ],
  templateUrl: './edit-profile-modal.component.html',
})
export class EditProfileModalComponent implements OnInit, OnDestroy {
  @Output() closed = new EventEmitter<void>();

  private readonly auth = inject(AuthService);
  private readonly roleService = inject(RoleService);
  private readonly studentApi = inject(StudentApiService);
  private readonly companyApi = inject(CompanyApiService);
  private readonly campusApi = inject(CampusApiService);
  private readonly notify = inject(NotificationService);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly storage = inject(StorageService);

  private readonly departmentApi = inject(CampusApiService);
private readonly departmentDetailService = inject(DepartmentDetailService);


  isEditMode = signal(false);
  viewSubmitting = signal(false);
  readonly isAdmin = this.roleService.isAdmin();
  
  userType: UserType | null = null;
  selectedStudentId: string | null = null;
  selectedStudentUserId: string | null = null;
  selectedCompanyId: string | null = null;
  selectedCompanyUserId: string | null = null;
  selectedCampusId: string | null = null;
  selectedCampusEmail: string | null = null;
  
  studentViewValue: StudentFormValue = createEmptyStudentFormValue();
  companyViewValue: CompanyFormValue = CompanyFormComponent.createEmptyValue();
  campuses: CampusResponse[] = [];
  campusViewValue: CampusFormValue = {
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

  selectedDepartmentId: string | null = null;

departmentViewValue: DepartmentFormValue = {
  departmentName: '',
  email: '',
  phone: '',
  about: '',
  photoUrl: '',
  photo: null
};

  // Phone verification state
  showPhoneVerificationModal = false;
  phoneVerificationState = {
    phoneNumber: '',
    confirmationResult: null as ConfirmationResult | null,
    otp: '',
    sendingOtp: false,
    verifyingOtp: false,
    recaptchaVerifier: null as RecaptchaVerifier | null,
  };
  phoneVerified = signal(false);
  verifiedPhoneNumber = signal<string | null>(null); // Track which phone number is verified
  currentPhoneField: 'mobile' | 'adminPhone' | 'phone' | null = null;


  private visibilityListener: (() => void) | null = null;

  ngOnInit(): void {
    this.userType = this.roleService.getUserType();
    this.isEditMode.set(!this.isAdmin);
    this.loadCampuses();
    this.loadUserProfileWithRetry();
    this.setupVisibilityReload();
  }

  private setupVisibilityReload(): void {
    if (typeof document === 'undefined') return;
    this.visibilityListener = () => {
      if (document.visibilityState === 'visible') {
        this.loadUserProfile();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityListener);
  }

  private removeVisibilityListener(): void {
    if (this.visibilityListener && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityListener);
      this.visibilityListener = null;
    }
  }

  /** Retry load when auth may not be ready yet (e.g. after tab switch). */
  private loadUserProfileWithRetry(attempt = 0): void {
    const maxAttempts = 3;
    if (attempt > 0) {
      this.userType = this.roleService.getUserType();
    }
    const didCallApi = this.loadUserProfile();
    if (!didCallApi && attempt < maxAttempts - 1) {
      setTimeout(() => this.loadUserProfileWithRetry(attempt + 1), 250);
    }
  }

  private loadCampuses(): void {
    this.studentApi.getRegisteredCampuses().subscribe({
      next: (response) => {
        const items = unwrapApiResponse<CampusResponse[]>(response);
        if (Array.isArray(items)) {
          this.campuses = items;
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('Failed to load campuses:', error);
      },
    });
  }

  toggleEditMode(): void {
    this.isEditMode.update(mode => !mode);
  }

  closeModal(): void {
    this.closed.emit();
  }

  handleCancel(): void {
    // For non-admin users (students, companies, campuses), close the modal
    // For admin users, just toggle edit mode
    if (this.isAdmin) {
      this.toggleEditMode();
    } else {
      this.closeModal();
    }
  }

  /** Returns true if the API was called, false if it returned early. */
  private loadUserProfile(): boolean {
    let currentUser = this.auth.getCurrentUser();
    if (!currentUser) {
      const stored = this.storage.get(STORAGE_KEYS.USER_DATA) as Record<string, unknown> | null;
      if (stored && typeof stored === 'object' && stored['userId']) {
        currentUser = stored as unknown as UserData;
        if (!this.userType && currentUser.userType) {
          this.userType = currentUser.userType;
        }
      }
    }
    const effectiveUserType = this.userType ?? currentUser?.userType ?? null;
    if (!currentUser?.userId || !effectiveUserType) {
      return false;
    }

    this.viewSubmitting.set(true);

    if (effectiveUserType === 'STUDENT') {
      // studentId can be in currentUser or in crm_student_id storage (set on login)
      const studentIdFromUser = currentUser.studentId;
      const studentIdFromStorage = this.storage.get(STORAGE_KEYS.STUDENT_ID) as string | null;
      const studentIdToUse = studentIdFromUser ?? studentIdFromStorage;
      if (!studentIdToUse) {
        this.viewSubmitting.set(false);
        console.warn('Student ID not found for student user (checked user.studentId and crm_student_id)');
        return false;
      }
      this.selectedStudentId = typeof studentIdToUse === 'string' ? studentIdToUse : String(studentIdToUse);
      this.selectedStudentUserId = currentUser.userId.toString();

      this.studentApi.getStudentFullProfile(this.selectedStudentId, this.selectedStudentUserId, 'STUDENT').subscribe({
        next: (response) => {
          this.viewSubmitting.set(false);
          const data = response.data ?? {};
          if (!isRecord(data)) {
            return;
          }
          
          this.studentViewValue = this.mapFullProfileToFormValue(data);
          this.cdr.detectChanges();
        },
        error: () => {
          this.viewSubmitting.set(false);
          this.cdr.detectChanges();
        },
      });
      return true;
    } else if (effectiveUserType === 'COMPANY') {
      // For company users editing their own profile
      // companyId can be in currentUser or in crm_company_id storage (set separately on login)
      const companyIdFromUser = currentUser.companyId;
      const companyIdFromStorage = this.storage.get(STORAGE_KEYS.COMPANY_ID) as string | null;
      const companyIdToUse = companyIdFromUser ?? companyIdFromStorage;
      if (!companyIdToUse) {
        this.viewSubmitting.set(false);
        console.warn('Company ID not found for company user (checked user.companyId and crm_company_id)');
        return false;
      }
      const companyUserId = typeof companyIdToUse === 'string' ? companyIdToUse : String(companyIdToUse);
      this.selectedCompanyUserId = companyUserId;

      // For users editing their own profile, try using userId as companyId
      // The profile response will contain the actual companyId which we'll use for updates
      this.companyApi.getCompanyById(companyUserId).subscribe({
        next: (profile) => {
          this.viewSubmitting.set(false);
          if (!profile?.companyId) {
            return;
          }
          // Store IDs from the profile response for use in updates
          this.selectedCompanyId = profile.companyId;
          this.selectedCompanyUserId = profile.userId ?? companyUserId;
          this.companyViewValue = this.mapProfileToFormValue(profile);
          this.cdr.detectChanges();
        },
        error: () => {
          this.viewSubmitting.set(false);
          this.cdr.detectChanges();
        },
      });
      return true;
    } else if (effectiveUserType === 'CAMPUS') {
      // campusId can be in currentUser (campusId/profileServiceId) or in crm_campus_id storage
      const campusIdFromUser = currentUser?.campusId ?? currentUser?.profileServiceId ?? null;
      const campusIdFromStorage = this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null;
      const campusIdToUse = campusIdFromUser ?? campusIdFromStorage ?? currentUser?.userId?.toString() ?? null;
      if (!campusIdToUse) {
        this.viewSubmitting.set(false);
        console.warn('Campus ID not found for campus user (checked user, crm_campus_id, and userId)');
        return false;
      }
      this.selectedCampusId = campusIdToUse;
      this.selectedCampusEmail = currentUser?.email ?? null;

      this.campusApi.getCampusById(campusIdToUse).subscribe({
        next: (profile) => {
          this.viewSubmitting.set(false);
          if (!profile?.campusId && !profile?.id) {
            console.warn('Campus profile not found or invalid');
            return;
          }
          const actualCampusId = profile.campusId ?? profile.id ?? null;
          if (actualCampusId) {
            this.selectedCampusId = actualCampusId;
          }
          this.selectedCampusEmail = profile.email ?? profile.adminEmail ?? currentUser?.email ?? null;
          this.campusViewValue = this.mapCampusProfileToFormValue(profile);
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error loading campus profile:', error);
          this.viewSubmitting.set(false);
          this.cdr.detectChanges();
        },
      });
      return true;
    }
 else if (effectiveUserType === 'DEPARTMENT') {

  // departmentId can be in currentUser or in crm_department_id storage (set on login)
  const departmentIdFromUser = currentUser?.departmentId;
  const departmentIdFromStorage = this.storage.get(STORAGE_KEYS.DEPARTMENT_ID) as string | null;
  const departmentId = departmentIdFromUser ?? departmentIdFromStorage;

  const userData = this.storage.get(STORAGE_KEYS.USER_DATA) as Record<string, unknown> | null;

  const campusEmail: string | null =
    (currentUser?.email as string | undefined) ??
    (userData?.['email'] as string | undefined) ??
    null;

  this.selectedCampusEmail = campusEmail;

  if (!departmentId) {
    this.viewSubmitting.set(false);
    console.warn('Department ID missing');
    return false;
  }

 this.departmentApi.getDepartmentById(departmentId).subscribe({
  next: (dept) => {
    this.viewSubmitting.set(false);

    if (!dept) return;

   this.departmentViewValue = {
  departmentName: dept.departmentName ?? '',
  email: dept.email ?? '',
  phone: dept.phone ?? '',
  about: dept.aboutDepartment ?? '',
  photoUrl: dept.photoUrl ?? '',
  photo: null
};

// force UI refresh
this.departmentViewValue = { ...this.departmentViewValue };
this.cdr.detectChanges();


    // Always store correct Mongo ID for update API
this.selectedDepartmentId =
  dept.id ||
  ((dept as unknown as { _id?: string })._id) ||
  departmentId;



    this.cdr.detectChanges();
  },
  error: () => {
    this.viewSubmitting.set(false);
  },
});

  return true;
}


  return false;
  }

  handleFormSubmit(value: StudentFormValue | CompanyFormValue | CampusFormValue): void {
    // For non-admin users, always allow submission (they're always in edit mode)
    // For admin users, only allow submission when isEditMode is true
    if (this.isAdmin && !this.isEditMode()) {
      return;
    }

    this.viewSubmitting.set(true);

    if (this.userType === 'STUDENT') {
      this.handleStudentFormSubmit(value as StudentFormValue);
    } else if (this.userType === 'COMPANY') {
      this.handleCompanyFormSubmit(value as CompanyFormValue);
    } else if (this.userType === 'CAMPUS') {
      this.handleCampusFormSubmit(value as CampusFormValue);
    }
 

  }

  private handleStudentFormSubmit(value: StudentFormValue): void {
    if (!this.selectedStudentId || !this.selectedStudentUserId) {
      this.viewSubmitting.set(false);
      return;
    }

    const updateRequest = this.mapStudentFormValueToUpdateRequest(value);
    const updatePayload = this.buildStudentUpdatePayload(value, updateRequest);
    this.studentApi.updateStudentFullProfile(this.selectedStudentId, this.selectedStudentUserId, updatePayload).subscribe({
      next: () => {
        this.notify.success('Profile updated successfully');
        this.reloadStudentProfile();
      },
      error: () => {
        this.viewSubmitting.set(false);
        this.cdr.detectChanges();
      },
    });
  }

  private handleCompanyFormSubmit(value: CompanyFormValue): void {
    if (!this.selectedCompanyId || !this.selectedCompanyUserId) {
      this.viewSubmitting.set(false);
      return;
    }

    const updatePayload = this.buildCompanyUpdatePayload(value);

    this.companyApi.updateCompany(this.selectedCompanyId, this.selectedCompanyUserId, updatePayload).subscribe({
      next: () => {
        this.notify.success('Company profile updated successfully');
        this.reloadCompanyProfile();
      },
      error: () => {
        this.viewSubmitting.set(false);
        this.cdr.detectChanges();
      },
    });
  }

  private handleCampusFormSubmit(value: CampusFormValue): void {
    if (!this.selectedCampusEmail) {
      this.viewSubmitting.set(false);
      this.notify.error('Campus email is required to update profile');
      return;
    }

    const updateRequest = this.mapCampusFormValueToUpdateRequest(value);
    const photo = value.campusLogoFiles?.length ? value.campusLogoFiles[0] : null;
    this.campusApi.updateCampusProfile(this.selectedCampusEmail, updateRequest, photo).subscribe({
      next: () => {
        this.notify.success('Profile updated successfully');
        this.reloadCampusProfile();
      },
      error: (error) => {
        this.viewSubmitting.set(false);
        console.error('Error updating campus profile:', error);
        
        // Extract error message from response
        let errorMessage = 'An internal error occurred. Please try again later.';
        
        if (error?.error) {
          if (error.error.message && typeof error.error.message === 'string' && error.error.message.trim()) {
            errorMessage = error.error.message;
          } else if (error.error.error && typeof error.error.error === 'string' && error.error.error.trim()) {
            errorMessage = error.error.error;
          }
        } else if (error?.message && typeof error.message === 'string' && error.message.trim()) {
          errorMessage = error.message;
        }
        
        this.notify.error(errorMessage);
        this.cdr.detectChanges();
      },
    });
  }

handleDepartmentFormSubmit(value: {
  departmentName: string;
  email: string;
  phone: string;
  about: string;
  photo?: File | null;
}): void {

  if (!this.selectedDepartmentId) {
    this.notify.error('Department ID missing');
    return;
  }

  if (!this.selectedCampusEmail) {
    this.notify.error('Campus email missing');
    return;
  }

  this.viewSubmitting.set(true);

  // Use verified phone number if available
  const phoneToUse = this.verifiedPhoneNumber() && 
    value.phone.replace(/\D/g, '') === this.verifiedPhoneNumber()!.replace(/\D/g, '')
    ? this.verifiedPhoneNumber()!.replace(/^\+/, '') // Remove + prefix if present
    : value.phone;

  //  clean payload (photo file alag handle hoga future me)
  const payload = {
    departmentName: value.departmentName,
    email: value.email,
    phone: phoneToUse,
    aboutDepartment: value.about,
  };

  this.departmentApi.updateDepartment(
    this.selectedDepartmentId,
    payload,
    this.selectedCampusEmail
  ).subscribe({
    next: () => {
  this.notify.success('Department updated successfully');

  //  refresh sidebar department list
  window.dispatchEvent(new Event('departmentUpdated'));

  //  refresh department detail modal if open
  window.dispatchEvent(new Event('departmentReload'));

  //  reload latest department data in edit profile
  this.loadUserProfile();

  this.isEditMode.set(false);
  this.viewSubmitting.set(false);
},

    error: () => {
      this.viewSubmitting.set(false);
      this.notify.error('Update failed');
    }
  });
}



  private reloadStudentProfile(): void {
    if (!this.selectedStudentId || !this.selectedStudentUserId) {
      return;
    }

    this.viewSubmitting.set(true);
    this.studentApi.getStudentFullProfile(this.selectedStudentId, this.selectedStudentUserId, 'ADMIN').subscribe({
      next: (response) => {
        this.viewSubmitting.set(false);
        const data = response.data ?? {};
        if (!isRecord(data)) {
          return;
        }
        this.studentViewValue = this.mapFullProfileToFormValue(data);
        this.isEditMode.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.viewSubmitting.set(false);
        this.cdr.detectChanges();
      },
    });
  }

  private reloadCompanyProfile(): void {
    if (!this.selectedCompanyId) {
      return;
    }

    this.viewSubmitting.set(true);
    this.companyApi.getCompanyById(this.selectedCompanyId).subscribe({
      next: (profile) => {
        this.viewSubmitting.set(false);
        if (!profile?.companyId) {
          return;
        }
        this.companyViewValue = this.mapProfileToFormValue(profile);
        this.isEditMode.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.viewSubmitting.set(false);
        this.cdr.detectChanges();
      },
    });
  }

  private reloadCampusProfile(): void {
    if (!this.selectedCampusId) {
      return;
    }

    this.viewSubmitting.set(true);
    this.campusApi.getCampusById(this.selectedCampusId).subscribe({
      next: (profile) => {
        this.viewSubmitting.set(false);
        if (!profile?.campusId && !profile?.id) {
          return;
        }
        const actualCampusId = profile.campusId ?? profile.id ?? null;
        if (actualCampusId) {
          this.selectedCampusId = actualCampusId;
        }
        this.selectedCampusEmail = profile.email ?? profile.adminEmail ?? null;
        this.campusViewValue = this.mapCampusProfileToFormValue(profile);
        this.isEditMode.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.viewSubmitting.set(false);
        this.cdr.detectChanges();
      },
    });
  }

  private mapStudentFormValueToUpdateRequest(value: StudentFormValue): Record<string, unknown> {
    const userIdToUse = this.selectedStudentUserId || undefined;
    const registerRequest = mapStudentFormValueToRegisterRequest(value, userIdToUse);

    const { personalInfo, educationDetails, skillsAndExperience, additionalInfo } = registerRequest;
    const { skills, projects } = skillsAndExperience;

    // Map projects to array of objects as expected by backend
    const mappedProjects = projects
      .filter((p) => p.projectName || p.description)
      .map((p) => ({
        projectName: p.projectName || '',
        description: p.description || '',
        technologiesUsed: p.technologiesUsed || [],
      }));

    // Use verified phone number if available
    const phoneToUse = this.verifiedPhoneNumber() && 
      value.mobile.replace(/\D/g, '') === this.verifiedPhoneNumber()!.replace(/\D/g, '')
      ? this.verifiedPhoneNumber()!.replace(/^\+/, '') // Remove + prefix if present
      : personalInfo.phoneNumber;

    return {
      firstName: personalInfo.firstName,
      lastName: personalInfo.lastName,
      gender: personalInfo.gender,
      dateOfBirth: personalInfo.dateOfBirth,
      phoneNumber: phoneToUse,
      profilePhotoUrl: personalInfo.profilePhotoUrl || '',
      rank: '',
      address: personalInfo.address || '',
      about: personalInfo.about || '',
      email: personalInfo.email.toLowerCase(),
      qualifications: educationDetails.qualifications,
      institutionName: educationDetails.institutionName,
      campusId: educationDetails.campusId || [],
      campusAddress: educationDetails.campusAddress || [],
      departmentId: educationDetails.departmentId || [],
      other: educationDetails.other || false,
      degrees: educationDetails.degrees,
      specializations: educationDetails.specializations,
      yearOfPassing: educationDetails.yearOfPassing || '',
      certificates: educationDetails.certificates || [],
      cgpa: educationDetails.cgpa || '',
      technicalSkills: skills.technicalSkills,
      softSkills: skills.softSkills,
      proficiencyLevel: skills.proficiencyLevel && skills.proficiencyLevel.trim() ? skills.proficiencyLevel : 'BEGINNER',
      languagesKnown: skills.languagesKnown,
      jobRolesOfInterest: skills.jobRolesOfInterest,
      preferredLocation: skills.preferredLocation,
      availability: skills.availability,
      expectedSalary: skills.expectedSalary || '',
      employmentType: skills.employmentType,
      companyName: skills.companyName || '',
      role: skills.role || '',
      startDate: skills.startDate || '',
      endDate: skills.endDate || '',
      currentlyWorking: skills.currentlyWorking || false,
      // Projects as array of objects (not flattened)
      projects: mappedProjects,
      govtIdProofUrl: additionalInfo.govtIdProofUrl || '',
      portfolioUrl: additionalInfo.portfolioUrl || '',
      resumeUrl: additionalInfo.resumeUrl || '',
      otherWebsites: additionalInfo.otherWebsites || [],
      offersInHand: additionalInfo.offersInHand || false,
      jobAlertPreference: additionalInfo.jobAlertPreference || 'NONE',
      howDidYouHear: additionalInfo.howDidYouHear || '',
      termsAndCondition: additionalInfo.termsAndCondition || false,
    };
  }

  private buildStudentUpdatePayload(
    value: StudentFormValue,
    request: Record<string, unknown>,
  ): StudentUpdatePayload {
    return {
      request,
      files: this.buildStudentUpdateFiles(value),
    };
  }

  private buildStudentUpdateFiles(value: StudentFormValue): StudentUpdateFiles {
    return {
      profilePhoto: value.photoFiles?.item(0) ?? null,
      resume: value.additional.resumeFiles?.item(0) ?? null,
      govtIdProof: value.additional.govtIdProofFiles?.item(0) ?? null,
      portfolio: null,
    };
  }

  private mapCompanyFormValueToUpdateRequest(value: CompanyFormValue): CompanyRegisterRequest {
    // Use verified phone number if available, otherwise use form value
    const phoneToUse = this.verifiedPhoneNumber() && 
      value.adminPhone.replace(/\D/g, '') === this.verifiedPhoneNumber()!.replace(/\D/g, '')
      ? this.verifiedPhoneNumber()!.replace(/^\+/, '') // Remove + prefix if present
      : value.adminPhone || '';
    
    return {
      companyName: value.companyName || '',
      companyLogoUrl: this.resolveCompanyPhotoValue(value.companyPhoto, value.companyPhotoUrl),
      adminName: value.adminName || '',
      adminDesignation: value.adminDesignation || '',
      adminEmail: (value.adminEmail || '').toLowerCase(),
      adminPhone: phoneToUse,
      websiteUrl: value.companyWebsiteUrl || '',
      otherWebsiteUrl: value.otherWebsiteUrl || '',
      registerNumber: value.registerNumber || '',
      keyPeople: value.keyPeople.map((p) => ({
        name: p.name || '',
        designation: p.designation || '',
        photoUrl: this.resolveCompanyPhotoValue(p.photo, p.photoUrl),
      })),
      aboutCompany: value.aboutCompany || '',
      companyAddress: value.companyAddress || '',
    };
  }

  private buildCompanyUpdatePayload(value: CompanyFormValue): CompanyRegisterPayload {
    return {
      request: this.mapCompanyFormValueToUpdateRequest(value),
      files: this.buildCompanyUpdateFiles(value),
    };
  }

  private buildCompanyUpdateFiles(value: CompanyFormValue): CompanyRegisterFiles {
    const keyPersonPhotos = value.keyPeople.map((person) => person.photo);
    return {
      companyLogo: value.companyPhoto,
      keyPerson1Photo: keyPersonPhotos[0] ?? null,
      keyPerson2Photo: keyPersonPhotos[1] ?? null,
      keyPerson3Photo: keyPersonPhotos[2] ?? null,
    };
  }

  private resolveCompanyPhotoValue(file: File | null, existingUrl?: string): string | undefined {
    const fileName = file?.name?.trim();
    if (fileName) {
      return fileName;
    }
    const cleaned = (existingUrl ?? '').trim();
    if (!cleaned) {
      return undefined;
    }
    if (cleaned.toLowerCase() === 'string') {
      return undefined;
    }
    return cleaned;
  }

  private mapCampusFormValueToUpdateRequest(value: CampusFormValue): CampusProfileUpdateRequest {
    const campusRank = value.rank?.trim() ? value.rank.trim() : undefined;

    const campusLogoFileName = value.campusLogoFiles?.item(0)?.name?.trim();

    // Only include campusLogoUrl if a new file is selected
    // If no new file is selected, don't send it (backend will keep existing)
    const campusLogoUrl = campusLogoFileName ? campusLogoFileName : undefined;

    // Use verified phone number if available
    const phoneToUse = this.verifiedPhoneNumber() && 
      value.adminPhone.replace(/\D/g, '') === this.verifiedPhoneNumber()!.replace(/\D/g, '')
      ? this.verifiedPhoneNumber()!.replace(/^\+/, '') // Remove + prefix if present
      : value.adminPhone?.trim() || undefined;

    return {
      campusName: value.campusName?.trim() || undefined,
      campusLogoUrl: campusLogoUrl,
      campusRank,
      adminName: value.adminName?.trim() || undefined,
      adminEmail: value.adminEmail ? value.adminEmail.toLowerCase().trim() : undefined,
      adminPhone: phoneToUse,
      adminDepartment: value.adminDept?.trim() || undefined,
      adminDesignation: value.adminDesignation?.trim() || undefined,
      websiteUrl: value.website?.trim() || undefined,
      campusWebsiteUrl: value.website?.trim() || undefined,
      aboutCampus: value.about?.trim() || undefined,
      campusAddress: value.address?.trim() || undefined,
    };
  }

  private mapFullProfileToFormValue(data: Record<string, unknown>): StudentFormValue {
    // API response has flat structure, not nested - all fields are in the root
    const firstName = readString(data, 'firstName');
    const lastName = readString(data, 'lastName');
    const phoneNumber = readString(data, 'phoneNumber');
    const about = readString(data, 'about');
    const gender = mapGenderFromApi(readString(data, 'gender'));
    const dateOfBirth = readString(data, 'dateOfBirth');

    // Work experience from flat structure
    const workExp: StudentFormValue['workExperience'] = [
      {
        companyName: readString(data, 'companyName'),
        role: readString(data, 'role'),
        startDate: readString(data, 'startDate'),
        endDate: readString(data, 'endDate'),
        currentlyWorkingHere: readBoolean(data, 'currentlyWorking') ?? false,
      },
    ];

    // Skills from flat structure
    const technicalSkills = readStringArray(data, 'technicalSkills').map((s) => ({
      skill: s,
      proficiency: '',
    }));

    const softSkills = readStringArray(data, 'softSkills');
    const languagesKnown = readStringArray(data, 'languagesKnown');

    // Projects from flat structure
    const projectsFromApi = readRecordArray(data, 'projects').map((p) => ({
      projectName: readString(p, 'projectName'),
      description: readString(p, 'description'),
      technologiesUsed: readStringArray(p, 'technologiesUsed'),
    }));
    
    // Ensure at least one empty project item exists so fields are visible
    const projects = projectsFromApi.length > 0 
      ? projectsFromApi 
      : [{ projectName: '', description: '', technologiesUsed: [] }];

    // For dropdown fields, take the first value from the array
    const jobRolesArray = readStringArray(data, 'jobRolesOfInterest');
    const jobRolesInterested = jobRolesArray.length > 0 ? jobRolesArray[0] : '';
    const preferredLocationArray = readStringArray(data, 'preferredLocation');
    const preferredLocation = preferredLocationArray.length > 0 ? preferredLocationArray[0] : '';
    const availabilityToStart = readStringArray(data, 'availability').join(', ');
    const expectedSalary = readString(data, 'expectedSalary');

    const employmentTypes = readStringArray(data, 'employmentType');
    const wantsInternship = employmentTypes.includes('INTERNSHIP');
    const wantsFullTime = employmentTypes.includes('FULL_TIME');

    // Education from flat structure - map directly
    const education = mapEducationDetailsToForm(data);

    // Additional info from flat structure
    const otherWebsites = readStringArray(data, 'otherWebsites').join(', ');
    const offersInHand = mapBooleanToYesNo(readBoolean(data, 'offersInHand'));

    // Try to get email from data, or leave empty if not available
    const email = readString(data, 'email');
    const address = readString(data, 'address');
    const profilePhotoUrl = readString(data, 'profilePhotoUrl');
    
    // Construct full photo URL from filename
    let photoUrl: string | undefined = undefined;
    if (profilePhotoUrl) {
      if (profilePhotoUrl.startsWith('http://') || profilePhotoUrl.startsWith('https://')) {
        photoUrl = profilePhotoUrl;
      } else if (profilePhotoUrl.startsWith('/')) {
        photoUrl = `/api/v1/files${profilePhotoUrl}`;
      } else {
        photoUrl = `/api/v1/files/${profilePhotoUrl}`;
      }
    }
    
    const initial = createEmptyStudentFormValue({
      firstName,
      lastName,
      fullName: [firstName, lastName].filter(Boolean).join(' ').trim(),
      email: email || '',
      mobile: phoneNumber,
      profileSummary: about,
      address: address || '',
      dateOfBirth,
      gender,
      photoUrl,
      education,
      technicalSkills,
      softSkills,
      languagesKnown,
      workExperience: workExp,
      projects,
      workPreferences: {
        jobRolesInterested,
        preferredLocation,
        availabilityToStart,
        expectedSalary,
        employmentType: {
          internship: wantsInternship,
          fullTime: wantsFullTime,
          both: wantsInternship && wantsFullTime,
        },
      },
      additional: {
        ...createEmptyStudentFormValue().additional,
        portfolioUrl: readString(data, 'portfolioUrl'),
        govtIdProofUrl: readString(data, 'govtIdProofUrl'), // Map govt ID proof URL
        resumeUrl: readString(data, 'resumeUrl'), // Map resume URL
        otherWebsites,
        offersInHand,
        heardAboutPortal: readString(data, 'howDidYouHear'),
        jobAlertsVia: mapJobAlertPreferenceFromApi(readString(data, 'jobAlertPreference')),
        agreeToTerms: true,
      },
    });

    return initial;
  }

  private mapProfileToFormValue(profile: CompanyRegistrationResponse): CompanyFormValue {
    const aboutCompany = readFirstNonEmptyString(profile, ['aboutCompany', 'description', 'about']);
    const companyAddress = readFirstNonEmptyString(profile, ['companyAddress', 'address']);
    const adminPhone = profile.adminPhone ?? '';

    // If phone is verified, mark it as verified
    if (adminPhone && this.verifiedPhoneNumber() && adminPhone.replace(/\D/g, '') === this.verifiedPhoneNumber()!.replace(/\D/g, '')) {
      // Phone is already verified
    }

    return {
      ...CompanyFormComponent.createEmptyValue(),
      companyName: profile.companyName ?? '',
      companyPhoto: null,
      companyPhotoUrl: profile.companyLogoUrl ?? '',
      adminName: profile.adminName ?? '',
      adminDesignation: profile.adminDesignation ?? '',
      adminEmail: profile.adminEmail ?? profile.email ?? '',
      adminPhone: adminPhone,
      companyWebsiteUrl: profile.websiteUrl ?? '',
      otherWebsiteUrl: profile.otherWebsiteUrl ?? '',
      registerNumber: profile.registerNumber ?? '',
      keyPeople:
        profile.keyPeople && profile.keyPeople.length > 0
          ? profile.keyPeople.map((p: KeyPersonResponse) => ({
              name: p.name ?? '',
              designation: p.designation ?? '',
              photo: null,
              photoUrl: p.photoUrl ?? '',
            }))
          : [CompanyFormComponent.createEmptyKeyPerson()],
      aboutCompany,
      companyAddress,
    };
  }

  ngOnDestroy(): void {
    this.removeVisibilityListener();
    // Clean up reCAPTCHA verifier
    if (this.phoneVerificationState.recaptchaVerifier) {
      this.phoneVerificationState.recaptchaVerifier.clear();
      this.phoneVerificationState.recaptchaVerifier = null;
    }
  }

  openPhoneVerification(phoneNumber: string, fieldType: 'mobile' | 'adminPhone' | 'phone'): void {
    if (!phoneNumber || phoneNumber.trim().length === 0) {
      this.notify.error('Please enter a phone number first');
      return;
    }

    this.currentPhoneField = fieldType;
    this.phoneVerificationState.phoneNumber = phoneNumber.trim();
    this.showPhoneVerificationModal = true;
    this.phoneVerificationState.otp = '';
    this.phoneVerificationState.confirmationResult = null;
    
    // Wait for modal to render before initializing reCAPTCHA
    this.cdr.detectChanges();
    setTimeout(() => {
      this.initializeRecaptchaAndSendOtp();
    }, 100);
  }

  private initializeRecaptchaAndSendOtp(): void {
    // Clear existing verifier if any
    if (this.phoneVerificationState.recaptchaVerifier) {
      this.phoneVerificationState.recaptchaVerifier.clear();
      this.phoneVerificationState.recaptchaVerifier = null;
    }

    // Check if container element exists
    const container = document.getElementById('phone-recaptcha-container');
    if (!container) {
      console.error('reCAPTCHA container not found');
      this.notify.error('Failed to initialize verification. Please try again.');
      this.showPhoneVerificationModal = false;
      return;
    }

    try {
      const auth = getFirebaseAuth();
      this.phoneVerificationState.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        'phone-recaptcha-container',
        {
          size: 'invisible',
          callback: () => {
            console.log('✅ reCAPTCHA verified');
          },
          'expired-callback': () => {
            console.warn('⚠️ reCAPTCHA expired');
            this.notify.error('reCAPTCHA expired. Please try again.');
            this.phoneVerificationState.sendingOtp = false;
            this.cdr.detectChanges();
          },
        }
      );

      // Automatically send OTP after reCAPTCHA is initialized
      void this.sendPhoneOtp();
    } catch (error) {
      console.error('❌ Failed to initialize reCAPTCHA:', error);
      this.notify.error('Failed to initialize verification. Please refresh and try again.');
      this.showPhoneVerificationModal = false;
    }
  }

  async sendPhoneOtp(): Promise<void> {
    if (this.phoneVerificationState.sendingOtp) {
      return;
    }

    this.phoneVerificationState.sendingOtp = true;
    try {
      const formattedPhone = formatPhoneNumber(this.phoneVerificationState.phoneNumber);
      console.log('📱 Sending OTP to:', formattedPhone);

      const auth = getFirebaseAuth();
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        this.phoneVerificationState.recaptchaVerifier!
      );
      
      this.phoneVerificationState.confirmationResult = confirmationResult;
      this.notify.success('OTP sent to your phone number');
    } catch (error: unknown) {
      console.error('❌ Phone OTP Send Error:', error);
      
      const errorCode = (error as { code?: string })?.code;
      const errorMessage = (error as { message?: string })?.message || '';

      if (errorCode === 'auth/invalid-phone-number') {
        this.notify.error('Invalid phone number format. Please check and try again.');
      } else if (errorCode === 'auth/too-many-requests') {
        this.notify.error('Too many requests. Please try again later.');
      } else if (errorCode === 'auth/billing-not-enabled') {
        this.notify.error(
          'Phone Authentication requires a paid Firebase plan (Blaze plan). Please upgrade your Firebase project or use test phone numbers for development.'
        );
        console.error('❌ Firebase billing not enabled. Phone Auth requires Blaze plan.');
        // Close modal
        this.showPhoneVerificationModal = false;
      } else if (errorCode === 'auth/operation-not-allowed') {
        this.notify.error(
          'Phone authentication is not enabled. Please enable it in Firebase Console → Authentication → Sign-in method → Phone.'
        );
        console.error('❌ Phone authentication not enabled in Firebase Console');
        // Close modal
        this.showPhoneVerificationModal = false;
      } else if (errorCode === 'auth/captcha-check-failed' || errorCode === 'auth/argument-error') {
        this.notify.error('reCAPTCHA verification failed. Please try again.');
        // Reset reCAPTCHA
        if (this.phoneVerificationState.recaptchaVerifier) {
          this.phoneVerificationState.recaptchaVerifier.clear();
          this.phoneVerificationState.recaptchaVerifier = null;
        }
        // Close modal to allow retry
        this.showPhoneVerificationModal = false;
      } else {
        const errorMsg = errorMessage || 'Failed to send OTP. Please try again.';
        this.notify.error(errorMsg);
        console.error('Full error details:', error);
      }
    } finally {
      this.phoneVerificationState.sendingOtp = false;
      this.cdr.detectChanges();
    }
  }

  async verifyPhoneOtp(): Promise<void> {
    if (
      !this.phoneVerificationState.confirmationResult ||
      !this.phoneVerificationState.otp.trim() ||
      this.phoneVerificationState.verifyingOtp
    ) {
      return;
    }

    this.phoneVerificationState.verifyingOtp = true;
    try {
      const result = await this.phoneVerificationState.confirmationResult.confirm(
        this.phoneVerificationState.otp.trim()
      );
      console.log('✅ Phone Verification Success:', result.user.phoneNumber);

      // Phone verified via Firebase!
      const verifiedPhone = this.phoneVerificationState.phoneNumber;
      this.phoneVerified.set(true);
      this.verifiedPhoneNumber.set(verifiedPhone); // Store verified phone number
      this.showPhoneVerificationModal = false;

      // Update the form value with verified phone
      this.updatePhoneInForm(verifiedPhone);

      // Call backend API to update isPhoneVerified in database
      // Use the original phone number format (not Firebase formatted)
      // Check if user is authenticated before making the API call
      if (!this.auth.isAuthenticated()) {
        console.warn('⚠️ User not authenticated, skipping backend phone verification');
        this.notify.success('Phone number verified successfully');
        this.notify.warn('Please refresh the page or log in again to sync verification status with the server.');
        return;
      }

      this.auth.verifyPhone({ phoneNumber: verifiedPhone }).subscribe({
        next: () => {
          console.log('✅ Phone number verified in backend database');
          this.notify.success('Phone number verified successfully');
        },
        error: (err: unknown) => {
          console.error('❌ Backend phone verification error:', err);
          
          // Check if it's an authentication error
          if (err && typeof err === 'object' && 'status' in err) {
            const httpError = err as { status?: number; error?: unknown; message?: string };
            if (httpError.status === 401) {
              console.warn('⚠️ Authentication token expired or invalid');
              this.notify.success('Phone number verified successfully');
              this.notify.warn('Phone verified but authentication expired. Please refresh the page to sync with server.');
              return;
            }
          }
          
          // Firebase verification succeeded, but backend update failed for other reasons
          this.notify.success('Phone number verified successfully');
          console.warn('⚠️ Backend verification failed but Firebase verification succeeded');
        },
      });

      this.phoneVerificationState.otp = '';
      this.phoneVerificationState.confirmationResult = null;
      
      // Force UI update
      this.cdr.detectChanges();
    } catch (error: unknown) {
      console.error('❌ Phone OTP Verification Error:', error);

      const errorCode = (error as { code?: string })?.code;
      if (errorCode === 'auth/invalid-verification-code') {
        this.notify.error('Invalid OTP code. Please try again.');
      } else if (errorCode === 'auth/code-expired') {
        this.notify.error('OTP code expired. Please request a new one.');
        this.showPhoneVerificationModal = false;
        this.phoneVerificationState.confirmationResult = null;
      } else {
        this.notify.error('Failed to verify OTP. Please try again.');
      }
    } finally {
      this.phoneVerificationState.verifyingOtp = false;
      this.cdr.detectChanges();
    }
  }

  handlePhoneVerificationCancel(): void {
    this.showPhoneVerificationModal = false;
    this.phoneVerificationState.otp = '';
    this.phoneVerificationState.confirmationResult = null;
    
    // Clean up reCAPTCHA verifier
    if (this.phoneVerificationState.recaptchaVerifier) {
      this.phoneVerificationState.recaptchaVerifier.clear();
      this.phoneVerificationState.recaptchaVerifier = null;
    }
    
    this.cdr.detectChanges();
  }

  resendPhoneOtp(): void {
    // Clear current confirmation and start over
    this.phoneVerificationState.confirmationResult = null;
    this.phoneVerificationState.otp = '';
    
    // Re-initialize reCAPTCHA and send OTP
    if (this.phoneVerificationState.recaptchaVerifier) {
      this.phoneVerificationState.recaptchaVerifier.clear();
      this.phoneVerificationState.recaptchaVerifier = null;
    }
    
    // Wait a bit for cleanup, then reinitialize
    setTimeout(() => {
      this.initializeRecaptchaAndSendOtp();
    }, 200);
  }

  private updatePhoneInForm(verifiedPhone: string): void {
    // Update based on userType and currentPhoneField
    if (this.userType === 'STUDENT' && this.currentPhoneField === 'mobile') {
      this.studentViewValue = { ...this.studentViewValue, mobile: verifiedPhone };
    } else if (
      (this.userType === 'COMPANY' || this.userType === 'CAMPUS') &&
      this.currentPhoneField === 'adminPhone'
    ) {
      if (this.userType === 'COMPANY') {
        this.companyViewValue = { ...this.companyViewValue, adminPhone: verifiedPhone };
      } else {
        this.campusViewValue = { ...this.campusViewValue, adminPhone: verifiedPhone };
      }
    } else if (this.userType === 'DEPARTMENT' && this.currentPhoneField === 'phone') {
      this.departmentViewValue = { ...this.departmentViewValue, phone: verifiedPhone };
    }
    
    // Store verified phone for button state
    this.verifiedPhoneNumber.set(verifiedPhone);
    this.cdr.detectChanges();
  }

  isPhoneVerified(phoneNumber: string): boolean {
    if (!phoneNumber || !this.verifiedPhoneNumber()) {
      return false;
    }
    // Compare phone numbers (normalize by removing formatting)
    const normalizedCurrent = phoneNumber.replace(/\D/g, '');
    const normalizedVerified = this.verifiedPhoneNumber()!.replace(/\D/g, '');
    return normalizedCurrent === normalizedVerified;
  }

  private mapCampusProfileToFormValue(profile: Campus | null): CampusFormValue {
    if (!profile) {
      return {
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
    }
    return {
      campusName: profile.campusName ?? '',
      campusLogoUrl: profile.photoUrl ?? '',
      campusLogoFiles: null,
      rank: profile.campusRank !== undefined && profile.campusRank !== null ? String(profile.campusRank) : '',
      adminName: profile.adminName ?? '',
      adminEmail: profile.adminEmail ?? profile.email ?? '',
      adminPhone: profile.adminPhone ?? '',
      adminDept: profile.adminDepartment ?? '',
      adminDesignation: profile.adminDesignation ?? '',
      website: profile.campusWebsiteUrl ?? '',
      about: profile.aboutCampus ?? '',
      address: profile.campusAddress ?? '',
      city: '',
      state: '',
      pincode: '',
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readRecordArray(obj: Record<string, unknown> | null, key: string): Record<string, unknown>[] {
  if (!obj) return [];
  const value = obj[key];
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord);
}

function readString(obj: Record<string, unknown> | null, key: string): string {
  if (!obj) return '';
  const value = obj[key];
  return typeof value === 'string' ? value : '';
}

function readStringArray(obj: Record<string, unknown> | null, key: string): string[] {
  if (!obj) return [];
  const value = obj[key];
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
}

function readBoolean(obj: unknown, key: string): boolean | null {
  if (!obj || typeof obj !== 'object') {
    return null;
  }
  const rec = obj as Record<string, unknown>;
  const val = rec[key];
  if (typeof val === 'boolean') {
    return val;
  }
  return null;
}

function mapGenderFromApi(gender: string): StudentFormValue['gender'] {
  if (gender === 'MALE') return 'male';
  if (gender === 'FEMALE') return 'female';
  if (gender === 'OTHER') return 'other';
  return null;
}

function mapBooleanToYesNo(value: boolean | null): 'yes' | 'no' | null {
  if (value === true) return 'yes';
  if (value === false) return 'no';
  return null;
}

/** Maps API JobAlertPreference enum (NONE, EMAIL, SMS, BOTH; legacy EMAIL_SMS → BOTH) to form value. */
function mapJobAlertPreferenceFromApi(apiValue: string): string {
  const v = (apiValue || '').trim().toUpperCase();
  if (v === 'EMAIL') return 'EMAIL';
  if (v === 'SMS') return 'SMS';
  if (v === 'BOTH' || v === 'EMAIL_SMS') return 'BOTH';
  return 'NONE';
}

function convertYearToDate(value: string): string {
  const trimmed = (value ?? '').trim();
  if (!trimmed) {
    return '';
  }
  if (trimmed.includes('-')) {
    return trimmed;
  }
  const year = parseInt(trimmed, 10);
  if (!Number.isNaN(year) && year > 0) {
    return `${year}-01-01`;
  }
  return trimmed;
}

function mapEducationDetailsToForm(education: Record<string, unknown> | null): StudentFormValue['education'] {
  if (!education) {
    return createEmptyStudentFormValue().education;
  }

  const qualifications = readStringArray(education, 'qualifications');
  const institutions = readStringArray(education, 'institutionName');
  const campusIds = readStringArray(education, 'campusId');
  const campusAddresses = readStringArray(education, 'campusAddress');
  const departmentIds = readStringArray(education, 'departmentId');
  const degrees = readStringArray(education, 'degrees');
  const specializations = readStringArray(education, 'specializations');
  // Prefer new array keys yearOfPassingList / cgpalist; fallback to yearOfPassing / cgpa
  const yearOfPassings: string[] = readStringArray(education, 'yearOfPassingList').length > 0
    ? readStringArray(education, 'yearOfPassingList')
    : (() => {
        const raw = education?.['yearOfPassing'];
        return Array.isArray(raw)
          ? (raw as string[]).filter((v): v is string => typeof v === 'string')
          : typeof raw === 'string' && raw.trim().length > 0
            ? [raw]
            : [];
      })();
  const cgpas: string[] = readStringArray(education, 'cgpalist').length > 0
    ? readStringArray(education, 'cgpalist')
    : (() => {
        const raw = education?.['cgpa'];
        return Array.isArray(raw)
          ? (raw as string[]).filter((v): v is string => typeof v === 'string')
          : typeof raw === 'string'
            ? [raw]
            : [];
      })();
  const certificates = readStringArray(education, 'certificates');
  const other = readBoolean(education, 'other') ?? false; // Read "other" flag

  const maxLen = Math.max(qualifications.length, institutions.length, degrees.length, specializations.length, 1);
  const out: StudentFormValue['education'] = [];
  for (let i = 0; i < maxLen; i++) {
    const campusId = campusIds[i];
    const institutionName = institutions[i] ?? '';
    
    // If "other" is true and campusId is empty/null, this is a custom institution
    // Set campusId to undefined and keep the custom institution name
    const isCustomInstitution = other && (!campusId || campusId === 'null' || campusId.trim() === '');
    
    out.push({
      qualification: qualifications[i] ?? '',
      institution: institutionName,
      campusId: isCustomInstitution ? undefined : campusId,
      campusAddress: isCustomInstitution ? undefined : campusAddresses[i],
      departmentId: isCustomInstitution ? undefined : departmentIds[i],
      degree: degrees[i] ?? '',
      specialization: specializations[i] ?? '',
      yearOfPassing: convertYearToDate(yearOfPassings[i] ?? yearOfPassings[0]),
      percentageOrCgpa: cgpas[i] ?? cgpas[0] ?? '',
      certificateFiles: null,
      certificateFileNames: i === 0 ? certificates : [],
    });
  }
  return out;
}

function readFirstNonEmptyString(obj: unknown, keys: readonly string[]): string {
  if (!obj || typeof obj !== 'object') {
    return '';
  }
  const rec = obj as Record<string, unknown>;
  for (const key of keys) {
    const val = rec[key];
    if (typeof val === 'string' && val.trim().length > 0) {
      return val;
    }
  }
  return '';
}

