import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { CardComponent, CardData } from '../../../../shared/components/card/card.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { AdminApiService } from '../../services/admin-api.service';
import { StudentApiService } from '../../../student/services/student-api.service';
import { StudentProfileResponse } from '../../../student/models/student.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { EnumLoginStatus } from '../../../../core/config/app.constants';
import {
  createEmptyStudentFormValue,
  StudentFormComponent,
  StudentFormValue,
} from '../../../../shared/components/forms/student-form/student-form.component';

@Component({
  selector: 'app-admin-student',
  standalone: true,
  imports: [
    CommonModule,
    CardComponent,
    PaginationComponent,
    ModalComponent,
    ButtonComponent,
    StudentFormComponent,
  ],
  templateUrl: './admin-student.component.html',
  styleUrl: './admin-student.component.css',
})
export class AdminStudentComponent implements OnInit {
  private readonly adminApi = inject(AdminApiService);
  private readonly studentApi = inject(StudentApiService);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly announcementDate = 'January 7th, 2025';

  students: CardData[] = [];
  displayedStudents: CardData[] = [];
  isLoading = false;

  showDeleteModal = false;
  selectedStudent: CardData | null = null;

  showViewModal = false;
  viewSubmitting = false;
  selectedStudentId: string | null = null;
  selectedStudentUserId: string | null = null;
  selectedStudentApprovalStatus: string | null = null;
  viewValue: StudentFormValue = createEmptyStudentFormValue();

  showReviewModal = false;
  pendingReviewStatus: EnumLoginStatus | null = null;

  currentPage = 1;
  readonly itemsPerPage = 9;
  totalPages = 1;

  ngOnInit(): void {
    this.loadStudents();
  }

  private loadStudents(): void {
    this.isLoading = true;
    this.students = [];
    this.displayedStudents = [];
    
    // this.adminApi.getUsersByType('STUDENT').subscribe({
    //   next: (users: UserResponse[]) => {
    //     try {
    //       if (users && Array.isArray(users) && users.length > 0) {
    //         this.students = users.map((user) => {
    //           const cardData: CardData = {
    //             id: user.userId ?? `student-${Math.random().toString(36).substr(2, 9)}`,
    //             name: user.email?.split('@')[0] ?? 'Student Name',
    //             imageUrl: 'assets/images/login-news-image.png',
    //             secondaryInfo: 'Campus Name',
    //             email: user.email ?? 'student@example.com',
    //             userId: user.userId,
    //           };
    //           return cardData;
    //         });
    //         this.totalPages = Math.max(1, Math.ceil(this.students.length / this.itemsPerPage));
    //         this.currentPage = 1;
    //         this.updateDisplayedStudents();
    //       } else {
    //         this.students = [];
    //         this.displayedStudents = [];
    //         this.totalPages = 1;
    //       }
    //     } catch {
    //       this.students = [];
    //       this.displayedStudents = [];
    //       this.totalPages = 1;
    //     }
    //     this.isLoading = false;
    //     this.cdr.detectChanges();
    //   },
    //   error: () => {
    //     this.students = [];
    //     this.displayedStudents = [];
    //     this.totalPages = 1;
    //     this.isLoading = false;
    //     this.cdr.detectChanges();
    //   },
    // });

    this.studentApi.getAllStudents('ADMIN').subscribe({
      next: (response) => {
        try {
          const studentProfiles = response.data ?? [];
          if (studentProfiles && Array.isArray(studentProfiles) && studentProfiles.length > 0) {
            this.students = studentProfiles.map((student: StudentProfileResponse) => {
              const fullName = `${student.firstName} ${student.lastName}`.trim() || 'Student Name';
              const cardData: CardData = {
                id: student.studentId ?? student.userId ?? `student-${Math.random().toString(36).substr(2, 9)}`,
                name: fullName,
                secondaryInfo: buildStudentSecondaryInfo(student.campusName),
                badge: toApprovalStatusLabel(student.approvalStatus),
                email: '', // StudentProfileResponse doesn't have email field
                userId: student.userId,
              };
              return cardData;
            });
            this.totalPages = Math.max(1, Math.ceil(this.students.length / this.itemsPerPage));
            this.currentPage = 1;
            this.updateDisplayedStudents();
          } else {
            this.students = [];
            this.displayedStudents = [];
            this.totalPages = 1;
          }
        } catch {
          this.students = [];
          this.displayedStudents = [];
          this.totalPages = 1;
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.students = [];
        this.displayedStudents = [];
        this.totalPages = 1;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private updateDisplayedStudents(): void {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.displayedStudents = [...this.students.slice(start, end)];
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updateDisplayedStudents();
  }

  onView(student: CardData): void {
    if (!student.id) {
      return;
    }

    const requesterUserId = toUserIdString(this.auth.getCurrentUser()?.userId);
    if (!requesterUserId) {
      return;
    }

    this.viewSubmitting = true;
    this.selectedStudentId = student.id;
    this.selectedStudentUserId = null;
    this.selectedStudentApprovalStatus = null;

    this.studentApi.getStudentFullProfile(student.id, requesterUserId, 'ADMIN').subscribe({
      next: (response) => {
        this.viewSubmitting = false;
        const data = response.data ?? {};
        if (!isRecord(data)) {
          return;
        }
        this.selectedStudentApprovalStatus = readString(data, 'approvalStatus') || null;
        this.selectedStudentUserId = readString(data, 'userId') || null;
        this.viewValue = this.mapFullProfileToFormValue(data);
        this.showViewModal = true;
        this.cdr.detectChanges();
      },
      error: () => {
        this.viewSubmitting = false;
      },
    });
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.viewSubmitting = false;
    this.selectedStudentId = null;
    this.selectedStudentUserId = null;
    this.selectedStudentApprovalStatus = null;
    this.viewValue = createEmptyStudentFormValue();
  }

  handleReviewAction(status: EnumLoginStatus): void {
    const studentId = this.selectedStudentId;
    if (!studentId) {
      return;
    }
    if (status !== 'APPROVED' && status !== 'REJECTED') {
      return;
    }
    this.pendingReviewStatus = status;
    this.showReviewModal = true;
  }

  confirmReviewAction(): void {
    const studentId = this.selectedStudentId;
    if (!studentId || !this.pendingReviewStatus) {
      return;
    }
    if (this.pendingReviewStatus !== 'APPROVED' && this.pendingReviewStatus !== 'REJECTED') {
      return;
    }

    const statusToSubmit = this.pendingReviewStatus;

    // Close review modal immediately
    this.closeReviewModal();
    this.cdr.detectChanges();

    // Show loading state and make API call
    this.viewSubmitting = true;
    this.studentApi
      .updateStudentApprovalStatus(studentId, 'ADMIN', { approvalStatus: statusToSubmit })
      .subscribe({
        next: () => {
          this.viewSubmitting = false;
          this.closeViewModal();
          this.loadStudents();
          this.cdr.detectChanges();
        },
        error: () => {
          this.viewSubmitting = false;
          this.cdr.detectChanges();
        },
      });
  }

  closeReviewModal(): void {
    this.showReviewModal = false;
    this.pendingReviewStatus = null;
  }

  onDelete(student: CardData): void {
    this.selectedStudent = student;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    const studentId = this.selectedStudent?.id;
    if (studentId) {
      this.studentApi.deleteStudent(studentId).subscribe({
        next: () => {
          this.closeDeleteModal();
          // Reset to first page if current page might be empty after deletion
          if (this.displayedStudents.length === 1 && this.currentPage > 1) {
            this.currentPage = 1;
          }
          this.loadStudents();
        },
        error: () => {
          this.closeDeleteModal();
        },
      });
    }
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.selectedStudent = null;
  }

  onApprove(student: CardData): void {
    if (student.id) {
      this.adminApi
        .approveStudent(student.id, { status: 'APPROVED', comment: 'Approved by admin' })
        .subscribe({
          next: () => {
            this.loadStudents();
          },
        });
    }
  }

  onReject(student: CardData): void {
    if (student.id && confirm('Are you sure you want to reject this student?')) {
      this.adminApi
        .approveStudent(student.id, { status: 'REJECTED', comment: 'Rejected by admin' })
        .subscribe({
          next: () => {
            this.loadStudents();
          },
        });
    }
  }

  onAdd(): void {
    // Add student functionality
  }

  get isSelectedStudentApproved(): boolean {
    const status = toApprovalStatusLabel(this.selectedStudentApprovalStatus);
    return status === 'APPROVED' || status === 'REJECTED';
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
    const projects = readRecordArray(data, 'projects').map((p) => ({
      projectName: readString(p, 'projectName'),
      description: readString(p, 'description'),
      technologiesUsed: readStringArray(p, 'technologiesUsed'),
    }));

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
    
    const initial = createEmptyStudentFormValue({
      firstName,
      lastName,
      fullName: [firstName, lastName].filter(Boolean).join(' ').trim(),
      email: email || '',
      mobile: phoneNumber,
      about,
      profileSummary: about,
      address: address || '',
      dateOfBirth,
      gender,
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
        otherWebsites,
        offersInHand,
        heardAboutPortal: readString(data, 'howDidYouHear'),
        jobAlertsVia: mapJobAlertPreferenceFromApi(readString(data, 'jobAlertPreference')),
        agreeToTerms: true, // Assume true if present
      },
    });

    return initial;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
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

function readBoolean(obj: Record<string, unknown> | null, key: string): boolean | null {
  if (!obj) return null;
  const value = obj[key];
  return typeof value === 'boolean' ? value : null;
}

function readStringArray(obj: Record<string, unknown> | null, key: string): string[] {
  if (!obj) return [];
  const value = obj[key];
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
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
  if (apiValue === 'EMAIL_SMS') return 'Email & SMS';
  return '';
}

function convertYearToDate(value: string): string {
  const trimmed = (value ?? '').trim();
  if (!trimmed) {
    return '';
  }
  // If it's already in YYYY-MM-DD format, return as is
  if (trimmed.includes('-')) {
    return trimmed;
  }
  // If it's just a year (e.g., "2024"), convert to date format (YYYY-01-01)
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
  const degrees = readStringArray(education, 'degrees');
  const specializations = readStringArray(education, 'specializations');
  const yearOfPassing = readString(education, 'yearOfPassing');
  const cgpa = readString(education, 'cgpa');
  const certificates = readStringArray(education, 'certificates');

  const maxLen = Math.max(qualifications.length, institutions.length, degrees.length, specializations.length, 1);
  const out: StudentFormValue['education'] = [];
  for (let i = 0; i < maxLen; i++) {
    out.push({
      qualification: qualifications[i] ?? '',
      institution: institutions[i] ?? '',
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

function toUserIdString(value: unknown): string | null {
  if (typeof value === 'string') {
    return value.trim().length > 0 ? value : null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : null;
  }
  return null;
}

function buildStudentSecondaryInfo(campusName: string | null | undefined): string {
  const campus = cleanUiText(campusName);
  return campus ? `Campus: ${campus}` : '';
}

function toApprovalStatusLabel(status: string | null | undefined): string {
  const cleaned = (status ?? '').trim();
  if (!cleaned) {
    return 'PENDING_APPROVAL';
  }
  if (cleaned === 'PENDING') {
    return 'PENDING_APPROVAL';
  }
  if (cleaned.toLowerCase() === 'string') {
    return 'PENDING_APPROVAL';
  }
  return cleaned;
}

function cleanUiText(value: string | null | undefined): string {
  const cleaned = (value ?? '').trim();
  if (!cleaned) return '';
  if (cleaned.toLowerCase() === 'string') return '';
  return cleaned;
}
