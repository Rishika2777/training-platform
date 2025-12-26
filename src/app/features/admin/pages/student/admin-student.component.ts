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
  viewValue: StudentFormValue = createEmptyStudentFormValue();

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
                imageUrl: student.profilePhotoUrl ?? 'assets/images/login-news-image.png',
                secondaryInfo: student.campusName ?? 'Campus Name',
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

    this.studentApi.getStudentFullProfile(student.id, requesterUserId, 'ADMIN').subscribe({
      next: (response) => {
        this.viewSubmitting = false;
        const data = response.data ?? {};
        if (!isRecord(data)) {
          return;
        }
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
    this.viewValue = createEmptyStudentFormValue();
  }

  handleReviewAction(status: EnumLoginStatus): void {
    const studentId = this.selectedStudentId;
    if (!studentId) {
      return;
    }

    // Backend expects studentId in query param (even if query param key is named "userId").
    const studentIdForQuery = studentId;

    this.viewSubmitting = true;
    this.studentApi
      .updateStudentFullProfile(studentId, studentIdForQuery, { approvalStatus: status })
      .subscribe({
        next: () => {
          this.viewSubmitting = false;
          this.closeViewModal();
          this.loadStudents();
        },
        error: () => {
          this.viewSubmitting = false;
        },
      });
  }

  onDelete(student: CardData): void {
    this.selectedStudent = student;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (this.selectedStudent?.userId) {
      this.adminApi.deleteUser(this.selectedStudent.userId).subscribe({
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

  private mapFullProfileToFormValue(data: Record<string, unknown>): StudentFormValue {
    const personal = readRecord(data, 'personalInfo') ?? data;
    const educationDetails = readRecord(data, 'educationDetails');
    const skillsAndExperience = readRecord(data, 'skillsAndExperience');
    const additional = readRecord(data, 'additionalInfo');

    const skills = skillsAndExperience ? readRecord(skillsAndExperience, 'skills') : null;

    const firstName = readString(personal, 'firstName');
    const lastName = readString(personal, 'lastName');
    const email = readString(personal, 'email');
    const phoneNumber = readString(personal, 'phoneNumber');
    const about = readString(personal, 'about');
    const address = readString(personal, 'address');
    const gender = mapGenderFromApi(readString(personal, 'gender'));
    const dateOfBirth = readString(personal, 'dateOfBirth');

    const workExp: StudentFormValue['workExperience'] = [
      {
        companyName: readString(skills, 'companyName'),
        role: readString(skills, 'role'),
        startDate: readString(skills, 'startDate'),
        endDate: readString(skills, 'endDate'),
        currentlyWorkingHere: readBoolean(skills, 'currentlyWorking') ?? false,
      },
    ];

    const technicalSkills = readStringArray(skills, 'technicalSkills').map((s) => ({
      skill: s,
      proficiency: '',
    }));

    const softSkills = readStringArray(skills, 'softSkills');
    const languagesKnown = readStringArray(skills, 'languagesKnown');

    const projects = readRecordArray(skillsAndExperience, 'projects').map((p) => ({
      projectName: readString(p, 'projectName'),
      description: readString(p, 'description'),
      projectUrl: readString(p, 'projectUrl'),
      githubUrl: readString(p, 'githubUrl'),
      technologiesUsed: readStringArray(p, 'technologiesUsed'),
    }));

    const jobRolesInterested = readStringArray(skills, 'jobRolesOfInterest').join(', ');
    const preferredLocation = readStringArray(skills, 'preferredLocation').join(', ');
    const availabilityToStart = readStringArray(skills, 'availability').join(', ');
    const expectedSalary = readString(skills, 'expectedSalary');

    const employmentTypes = readStringArray(skills, 'employmentType');
    const wantsInternship = employmentTypes.includes('INTERNSHIP');
    const wantsFullTime = employmentTypes.includes('FULL_TIME');

    const education = mapEducationDetailsToForm(educationDetails);

    const otherWebsites = readStringArray(additional, 'otherWebsites').join(', ');
    const offersInHand = mapBooleanToYesNo(readBoolean(additional, 'offersInHand'));

    const initial = createEmptyStudentFormValue({
      firstName,
      lastName,
      fullName: [firstName, lastName].filter(Boolean).join(' ').trim(),
      email,
      mobile: phoneNumber,
      about,
      profileSummary: about,
      address,
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
        portfolioUrl: readString(additional, 'portfolioUrl'),
        otherWebsites,
        offersInHand,
        heardAboutPortal: readString(additional, 'howDidYouHear'),
        jobAlertsVia: readString(additional, 'jobAlertPreference'),
        agreeToTerms: readBoolean(additional, 'termsAndCondition') ?? false,
      },
    });

    return initial;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readRecord(obj: Record<string, unknown> | null, key: string): Record<string, unknown> | null {
  if (!obj) return null;
  const value = obj[key];
  return isRecord(value) ? value : null;
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
      yearOfPassing: yearOfPassing,
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
