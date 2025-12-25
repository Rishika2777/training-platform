import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS, APP_CONFIG, APP_CONFIG_TOKEN, UserType } from '../../../core/config/app.constants';
import {
  StudentFormValue,
  StudentWorkPreferences,
} from '../../../shared/components/forms/student-form/student-form.component';

/**
 * Student API (ported from legacy `Synkup_FE/app/features/student/services/student.service.js`).
 */
@Injectable({ providedIn: 'root' })
export class StudentApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG_TOKEN, { optional: true }) ?? APP_CONFIG;
  private readonly baseUrl = this.config.STUDENT_API_BASE_URL || this.config.API_BASE_URL;

  registerStudent(
    data: StudentRegisterRequest,
    options?: RegisterStudentOptions,
  ): Observable<StudentRegisterResult> {
    const url = this.baseUrl + API_ENDPOINTS.STUDENT.REGISTER;
    const params = buildParams(options);

    return this.http.post<unknown>(url, data, { params }).pipe(map(extractStudentRegisterResult));
  }
}

export interface StudentPersonalInfo {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  email: string;
  phoneNumber: string;
  profilePhotoUrl?: string;
  address?: string;
  about?: string;
}

export interface StudentEducationDetails {
  qualifications: string[];
  institutionName: string[];
  degrees: string[];
  specializations: string[];
  yearOfPassing?: string;
  certificates?: string[];
  cgpa?: string;
}

export interface StudentSkills {
  technicalSkills: string[];
  softSkills: string[];
  proficiencyLevel?: string;
  languagesKnown: string[];
  jobRolesOfInterest: string[];
  preferredLocation: string[];
  availability: string[];
  expectedSalary?: string;
  employmentType: ('INTERNSHIP' | 'FULL_TIME' | 'PART_TIME')[];
  companyName?: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  currentlyWorking?: boolean;
}

export interface StudentProject {
  userId?: string;
  projectName: string;
  description: string;
  technologiesUsed: string[];
}

export interface StudentSkillsAndExperience {
  skills: StudentSkills;
  projects: StudentProject[];
}

export interface StudentAdditionalInfo {
  govtIdProofUrl?: string;
  portfolioUrl?: string;
  resumeUrl?: string;
  otherWebsites?: string[];
  offersInHand?: boolean;
  jobAlertPreference?: 'NONE' | 'EMAIL' | 'SMS' | 'EMAIL_SMS';
  howDidYouHear?: string;
  termsAndCondition: boolean;
}

export interface StudentRegisterRequest {
  personalInfo: StudentPersonalInfo;
  educationDetails: StudentEducationDetails;
  skillsAndExperience: StudentSkillsAndExperience;
  additionalInfo: StudentAdditionalInfo;
}

export interface RegisterStudentOptions {
  userId?: string | number;
  userType?: UserType;
}

export interface StudentRegisterResult {
  studentId: string | null;
  raw: unknown;
}

interface ApiResponse<T> {
  data?: T;
}

function buildParams(options?: RegisterStudentOptions): HttpParams {
  if (!options || (!options.userId && !options.userType)) {
    return new HttpParams();
  }
  let params = new HttpParams();
  if (options.userId !== undefined) {
    params = params.set('userId', String(options.userId));
  }
  if (options.userType) {
    params = params.set('userType', String(options.userType));
  }
  return params;
}

function unwrapResponse<T>(raw: unknown): T | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const maybe = raw as ApiResponse<T>;
  return maybe.data ?? null;
}

function readStringProp(obj: unknown, key: string): string | null {
  if (!obj || typeof obj !== 'object') {
    return null;
  }
  const rec = obj as Record<string, unknown>;
  const value = rec[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function extractStudentRegisterResult(raw: unknown): StudentRegisterResult {
  // Legacy backend may return { studentId }, { id }, or { data: { studentId } }.
  const directStudentId = readStringProp(raw, 'studentId') ?? readStringProp(raw, 'id');
  const wrapped = unwrapResponse<unknown>(raw);
  const wrappedStudentId = readStringProp(wrapped, 'studentId') ?? readStringProp(wrapped, 'id');

  return {
    studentId: directStudentId ?? wrappedStudentId,
    raw,
  };
}

function mapGenderToApi(gender: string | null): 'MALE' | 'FEMALE' | 'OTHER' {
  if (gender === 'male') return 'MALE';
  if (gender === 'female') return 'FEMALE';
  return 'OTHER';
}

function mapEmploymentType(workPreferences: StudentWorkPreferences): ('INTERNSHIP' | 'FULL_TIME' | 'PART_TIME')[] {
  const types: ('INTERNSHIP' | 'FULL_TIME' | 'PART_TIME')[] = [];
  if (workPreferences.employmentType.internship) {
    types.push('INTERNSHIP');
  }
  if (workPreferences.employmentType.fullTime) {
    types.push('FULL_TIME');
  }
  if (workPreferences.employmentType.both) {
    types.push('INTERNSHIP', 'FULL_TIME');
  }
  return types.length > 0 ? types : ['INTERNSHIP'];
}

function mapJobAlertPreference(jobAlertsVia: string): 'NONE' | 'EMAIL' | 'SMS' | 'EMAIL_SMS' {
  if (jobAlertsVia === 'Email') return 'EMAIL';
  if (jobAlertsVia === 'SMS') return 'SMS';
  if (jobAlertsVia === 'Email & SMS') return 'EMAIL_SMS';
  return 'NONE';
}

function mapYesNoToBoolean(value: 'yes' | 'no' | null): boolean | undefined {
  if (value === 'yes') return true;
  if (value === 'no') return false;
  return undefined;
}

export function mapStudentFormValueToRegisterRequest(
  formValue: StudentFormValue,
  userId?: string,
): StudentRegisterRequest {
  const education = formValue.education.filter((e) => e.qualification || e.institution || e.degree);
  const workExperience = formValue.workExperience.filter(
    (w) => w.companyName || w.role || w.startDate || w.endDate,
  );
  const projects = formValue.projects.filter((p) => p.projectName || p.description);

  const personalInfo: StudentPersonalInfo = {
    firstName: formValue.firstName || formValue.fullName.split(' ')[0] || '',
    lastName: formValue.lastName || formValue.fullName.split(' ').slice(1).join(' ') || '',
    dateOfBirth: formValue.dateOfBirth || '',
    gender: mapGenderToApi(formValue.gender),
    email: formValue.email || '',
    phoneNumber: formValue.mobile || '',
    profilePhotoUrl: undefined, // Will be set after file upload
    address: formValue.address || undefined,
    about: formValue.about || formValue.profileSummary || undefined,
  };

  // Find the most recent education (by yearOfPassing) or use the first one
  const sortedEducation = [...education].sort((a, b) => {
    const yearA = parseInt(a.yearOfPassing || '0', 10);
    const yearB = parseInt(b.yearOfPassing || '0', 10);
    return yearB - yearA; // Descending order (most recent first)
  });
  const mostRecentEducation = sortedEducation.length > 0 ? sortedEducation[0] : null;

  const educationDetails: StudentEducationDetails = {
    qualifications: education.map((e) => e.qualification).filter(Boolean),
    institutionName: education.map((e) => e.institution).filter(Boolean),
    degrees: education.map((e) => e.degree).filter(Boolean),
    specializations: education.map((e) => e.specialization).filter(Boolean),
    yearOfPassing: mostRecentEducation?.yearOfPassing || undefined,
    certificates: education.flatMap((e) => Array.from(e.certificateFileNames || [])).filter(Boolean),
    cgpa: mostRecentEducation?.percentageOrCgpa || undefined,
  };

  const latestWorkExp = workExperience.length > 0 ? workExperience[0] : null;
  const skills: StudentSkills = {
    technicalSkills: formValue.technicalSkills.map((s) => s.skill).filter(Boolean),
    softSkills: Array.from(formValue.softSkills).filter(Boolean),
    proficiencyLevel: formValue.technicalSkills.length > 0 ? formValue.technicalSkills[0].proficiency : undefined,
    languagesKnown: Array.from(formValue.languagesKnown).filter(Boolean),
    jobRolesOfInterest: formValue.workPreferences.jobRolesInterested
      ? [formValue.workPreferences.jobRolesInterested]
      : [],
    preferredLocation: formValue.workPreferences.preferredLocation
      ? [formValue.workPreferences.preferredLocation]
      : [],
    availability: formValue.workPreferences.availabilityToStart ? [formValue.workPreferences.availabilityToStart] : [],
    expectedSalary: formValue.workPreferences.expectedSalary || undefined,
    employmentType: mapEmploymentType(formValue.workPreferences),
    companyName: latestWorkExp?.companyName || undefined,
    role: latestWorkExp?.role || undefined,
    startDate: latestWorkExp?.startDate || undefined,
    endDate: latestWorkExp?.endDate || undefined,
    currentlyWorking: latestWorkExp?.currentlyWorkingHere || undefined,
  };

  const skillsAndExperience: StudentSkillsAndExperience = {
    skills,
    projects: projects.map((p) => ({
      userId,
      projectName: p.projectName || '',
      description: p.description || '',
      technologiesUsed: Array.from(p.technologiesUsed).filter(Boolean),
    })),
  };

  const additionalInfo: StudentAdditionalInfo = {
    govtIdProofUrl: undefined, // Will be set after file upload
    portfolioUrl: formValue.additional.portfolioUrl || undefined,
    resumeUrl: undefined, // Will be set after file upload
    otherWebsites: formValue.additional.otherWebsites
      ? [formValue.additional.otherWebsites].filter(Boolean)
      : undefined,
    offersInHand: mapYesNoToBoolean(formValue.additional.offersInHand),
    jobAlertPreference: mapJobAlertPreference(formValue.additional.jobAlertsVia),
    howDidYouHear: formValue.additional.heardAboutPortal || undefined,
    termsAndCondition: formValue.additional.agreeToTerms,
  };

  return {
    personalInfo,
    educationDetails,
    skillsAndExperience,
    additionalInfo,
  };
}


