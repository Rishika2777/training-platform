import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, inject, signal, ChangeDetectorRef, OnInit } from '@angular/core';
import { AuthService } from '../../../../core/auth/auth.service';
import { RoleService } from '../../../../core/rbac/role.service';
import { StudentApiService } from '../../../student/services/student-api.service';
import { CompanyApiService } from '../../../company/services/company-api.service';
import { CampusApiService, Campus, CampusProfileUpdateRequest } from '../../../campus/services/campus-api.service';
import { StudentFormComponent, StudentFormValue, createEmptyStudentFormValue } from '../../../../shared/components/forms/student-form/student-form.component';
import { CampusResponse } from '../../../student/models/student.models';
import { CompanyFormComponent, CompanyFormValue } from '../../../../shared/components/forms/company-form/company-form.component';
import { CampusFormComponent, CampusFormValue } from '../../../../shared/components/forms/campus-form/campus-form.component';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { UserType } from '../../../../core/config/app.constants';
import { mapStudentFormValueToRegisterRequest } from '../../../student/models/student.models';
import { CompanyRegistrationResponse, KeyPersonResponse, CompanyRegisterRequest } from '../../../company/services/company-api.service';

@Component({
  selector: 'app-edit-profile-modal',
  standalone: true,
  imports: [
    CommonModule,
    StudentFormComponent,
    CompanyFormComponent,
    CampusFormComponent,
  ],
  templateUrl: './edit-profile-modal.component.html',
})
export class EditProfileModalComponent implements OnInit {
  @Output() closed = new EventEmitter<void>();

  private readonly auth = inject(AuthService);
  private readonly roleService = inject(RoleService);
  private readonly studentApi = inject(StudentApiService);
  private readonly companyApi = inject(CompanyApiService);
  private readonly campusApi = inject(CampusApiService);
  private readonly notify = inject(NotificationService);
  private readonly cdr = inject(ChangeDetectorRef);

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

  ngOnInit(): void {
    this.userType = this.roleService.getUserType();
    // Non-admin users should start in edit mode by default
    this.isEditMode.set(!this.isAdmin);
    this.loadCampuses();
    this.loadUserProfile();
  }

  private loadCampuses(): void {
    this.studentApi.getRegisteredCampuses().subscribe({
      next: (response) => {
        if (response.data && Array.isArray(response.data)) {
          this.campuses = response.data;
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

  private loadUserProfile(): void {
    const currentUser = this.auth.getCurrentUser();
    if (!currentUser?.userId || !this.userType) {
      return;
    }

    this.viewSubmitting.set(true);

    if (this.userType === 'STUDENT') {
      // For STUDENT users, require studentId
      if (!currentUser.studentId) {
        this.viewSubmitting.set(false);
        console.warn('Student ID not found for student user');
        return;
      }
      // Use userId as studentId for users editing their own profile
      this.selectedStudentId = currentUser.studentId;
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
    } else if (this.userType === 'COMPANY') {
      // For company users editing their own profile
      // Store userId first - we'll update companyId from the profile response
      if (!currentUser.companyId) {
        this.viewSubmitting.set(false);
        console.warn('User ID not found for company user');
        return;
      }
      const companyUserId = currentUser.companyId.toString();
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
    } else if (this.userType === 'CAMPUS') {
      // For CAMPUS users, use campusId or profileServiceId if available
      // If not available, we'll try to get it from the API response
      this.selectedCampusId = currentUser?.campusId ?? currentUser?.profileServiceId ?? null;
      this.selectedCampusEmail = currentUser?.email ?? null;

      console.log('selectedCampusId', this.selectedCampusId);
      console.log('selectedCampusEmail', this.selectedCampusEmail);

      // If we don't have campusId, we need to find it another way
      // For now, try using userId or email to get the campus profile
      if (!currentUser.userId) {
        this.viewSubmitting.set(false);
        console.warn('User ID not found for campus user');
        return;
      }
      const campusIdToUse = this.selectedCampusId || currentUser.userId.toString();

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
    }
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
    this.studentApi.updateStudentFullProfile(this.selectedStudentId, this.selectedStudentUserId, updateRequest).subscribe({
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

    const updateRequest = this.mapCompanyFormValueToUpdateRequest(value);

    this.companyApi.updateCompany(this.selectedCompanyId, this.selectedCompanyUserId, updateRequest).subscribe({
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
    this.campusApi.updateCampusProfile(this.selectedCampusEmail, updateRequest).subscribe({
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

    return {
      firstName: personalInfo.firstName,
      lastName: personalInfo.lastName,
      gender: personalInfo.gender,
      dateOfBirth: personalInfo.dateOfBirth,
      phoneNumber: personalInfo.phoneNumber,
      profilePhotoUrl: personalInfo.profilePhotoUrl || '',
      rank: '',
      address: personalInfo.address || '',
      about: personalInfo.about || '',
      email: personalInfo.email.toLowerCase(),
      qualifications: educationDetails.qualifications,
      institutionName: educationDetails.institutionName,
      campusId: educationDetails.campusId || [],
      campusAddress: educationDetails.campusAddress || [], // Include campusAddress array from form
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

  private mapCompanyFormValueToUpdateRequest(value: CompanyFormValue): CompanyRegisterRequest {
    return {
      companyName: value.companyName || '',
      companyLogoUrl: value.companyPhoto ? value.companyPhoto.name : undefined,
      adminName: value.adminName || '',
      adminDesignation: value.adminDesignation || '',
      adminEmail: (value.adminEmail || '').toLowerCase(),
      adminPhone: value.adminPhone || '',
      websiteUrl: value.companyWebsiteUrl || '',
      otherWebsiteUrl: value.otherWebsiteUrl || '',
      registerNumber: value.registerNumber || '',
      keyPeople: value.keyPeople.map((p) => ({
        name: p.name || '',
        designation: p.designation || '',
        photoUrl: p.photo ? p.photo.name : undefined,
      })),
      aboutCompany: value.aboutCompany || '',
      companyAddress: value.companyAddress || '',
    };
  }

  private mapCampusFormValueToUpdateRequest(value: CampusFormValue): CampusProfileUpdateRequest {
    // Parse rank - only send if it's a valid positive number
    let campusRank: number | undefined = undefined;
    if (value.rank && value.rank.trim().length > 0) {
      const parsedRank = Number(value.rank.trim());
      if (Number.isFinite(parsedRank) && parsedRank > 0) {
        campusRank = parsedRank;
      }
    }
    
    const campusLogoFileName = value.campusLogoFiles?.item(0)?.name?.trim();

    // Only include campusLogoUrl if a new file is selected
    // If no new file is selected, don't send it (backend will keep existing)
    const campusLogoUrl = campusLogoFileName ? campusLogoFileName : undefined;

    return {
      campusName: value.campusName?.trim() || undefined,
      campusLogoUrl: campusLogoUrl,
      campusRank: campusRank,
      adminName: value.adminName?.trim() || undefined,
      adminEmail: value.adminEmail ? value.adminEmail.toLowerCase().trim() : undefined,
      adminPhone: value.adminPhone?.trim() || undefined,
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

    return {
      ...CompanyFormComponent.createEmptyValue(),
      companyName: profile.companyName ?? '',
      companyPhoto: null,
      companyPhotoUrl: profile.companyLogoUrl ?? '',
      adminName: profile.adminName ?? '',
      adminDesignation: profile.adminDesignation ?? '',
      adminEmail: profile.adminEmail ?? profile.email ?? '',
      adminPhone: profile.adminPhone ?? '',
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

function mapJobAlertPreferenceFromApi(apiValue: string): string {
  if (apiValue === 'EMAIL') return 'Email';
  if (apiValue === 'SMS') return 'SMS';
  if (apiValue === 'EMAIL_SMS' || apiValue === 'BOTH') return 'Email & SMS';
  return '';
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
  const campusIds = readStringArray(education, 'campusId'); // Read campusId array from API
  const campusAddresses = readStringArray(education, 'campusAddress'); // Read campusAddress array from API
  const degrees = readStringArray(education, 'degrees');
  const specializations = readStringArray(education, 'specializations');
  const yearOfPassing = readString(education, 'yearOfPassing');
  const cgpa = readString(education, 'cgpa');
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
      institution: isCustomInstitution ? institutionName : institutionName, // Keep the institution name as-is
      campusId: isCustomInstitution ? undefined : campusId, // Clear campusId for custom institutions
      campusAddress: isCustomInstitution ? undefined : campusAddresses[i], // Clear campusAddress for custom institutions
      degree: degrees[i] ?? '',
      specialization: specializations[i] ?? '',
      yearOfPassing: convertYearToDate(yearOfPassing),
      percentageOrCgpa: cgpa,
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

