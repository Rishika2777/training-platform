import {
  StudentFormValue,
  StudentWorkPreferences,
} from '../../../shared/components/forms/student-form/student-form.component';

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
  projectUrl?: string;
  githubUrl?: string;
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

export interface StudentCompleteRegistrationRequest {
  personalInfo: StudentPersonalInfo;
  educationDetails: StudentEducationDetails;
  skillsAndExperience: StudentSkillsAndExperience;
  additionalInfo: StudentAdditionalInfo;
}

export interface StudentRegistrationResponse {
  studentId: string;
  userId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  profilePhotoUrl?: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  phoneNumber: string;
  address?: string;
  about?: string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponseStudentRegistrationResponse {
  success: boolean;
  message?: string;
  data: StudentRegistrationResponse;
  error?: string;
  statusCode?: number;
  timestamp?: string;
}

export interface StudentProfileResponse {
  studentId: string;
  userId: string;
  campusId?: string;
  batchId?: string;
  firstName: string;
  lastName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth?: string;
  profilePhotoUrl?: string;
  phoneNumber?: string;
  batch?: string;
  rank?: string;
  campusName?: string;
  resumeUrl?: string;
  address?: string;
  about?: string;
  projects?: ProjectResponse[];
  description?: string;
  technologiesUsed?: string[];
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface ProjectResponse {
  projectId: string;
  studentId: string;
  userId: string;
  projectName: string;
  description: string;
  technologiesUsed: string[];
  createdAt: string;
}

export interface ApiResponseListStudentProfileResponse {
  success: boolean;
  message?: string;
  data: StudentProfileResponse[];
  error?: string;
  statusCode?: number;
  timestamp?: string;
}

// Swagger uses ApiResponseObject / ApiResponseStudentProfileResponse for full profile endpoints.
export type StudentFullProfileObject = Record<string, unknown>;
export type StudentUpdateRequest = Record<string, unknown>;

export interface ApiResponseObject {
  success?: boolean;
  message?: string;
  data?: StudentFullProfileObject;
  error?: string;
  statusCode?: number;
  timestamp?: string;
}

export interface ApiResponseStudentProfileResponse {
  success?: boolean;
  message?: string;
  data?: StudentFullProfileObject;
  error?: string;
  statusCode?: number;
  timestamp?: string;
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

function toTrimmedString(value: string | null | undefined): string {
  return (value ?? '').trim();
}

function toTrimmedStringArray(values: readonly string[]): string[] {
  return values.map((v) => v.trim()).filter((v) => v.length > 0);
}

export function mapStudentFormValueToRegisterRequest(
  formValue: StudentFormValue,
  userId?: string,
): StudentCompleteRegistrationRequest {
  const education = formValue.education.filter((e) => e.qualification || e.institution || e.degree);
  const workExperience = formValue.workExperience.filter(
    (w) => w.companyName || w.role || w.startDate || w.endDate,
  );
  const projects = formValue.projects.filter((p) => p.projectName || p.description);

  const personalInfo: StudentPersonalInfo = {
    firstName: toTrimmedString(formValue.firstName || formValue.fullName.split(' ')[0]),
    lastName: toTrimmedString(formValue.lastName || formValue.fullName.split(' ').slice(1).join(' ')),
    dateOfBirth: toTrimmedString(formValue.dateOfBirth),
    gender: mapGenderToApi(formValue.gender),
    email: toTrimmedString(formValue.email),
    phoneNumber: toTrimmedString(formValue.mobile),
    // File uploads are not wired to backend yet; send filename if chosen, else empty.
    profilePhotoUrl: toTrimmedString(formValue.photoFiles?.item(0)?.name),
    address: toTrimmedString(formValue.address),
    about: toTrimmedString(formValue.about || formValue.profileSummary),
  };

  // Find the most recent education (by yearOfPassing) or use the first one
  const sortedEducation = [...education].sort((a, b) => {
    const yearA = parseInt(a.yearOfPassing || '0', 10);
    const yearB = parseInt(b.yearOfPassing || '0', 10);
    return yearB - yearA; // Descending order (most recent first)
  });
  const mostRecentEducation = sortedEducation.length > 0 ? sortedEducation[0] : null;

  const educationDetails: StudentEducationDetails = {
    qualifications: toTrimmedStringArray(education.map((e) => e.qualification).filter(Boolean)),
    institutionName: toTrimmedStringArray(education.map((e) => e.institution).filter(Boolean)),
    degrees: toTrimmedStringArray(education.map((e) => e.degree).filter(Boolean)),
    specializations: toTrimmedStringArray(education.map((e) => e.specialization).filter(Boolean)),
    yearOfPassing: toTrimmedString(mostRecentEducation?.yearOfPassing),
    certificates: toTrimmedStringArray(
      education.flatMap((e) => Array.from(e.certificateFileNames || [])).filter(Boolean),
    ),
    cgpa: toTrimmedString(mostRecentEducation?.percentageOrCgpa),
  };

  const latestWorkExp = workExperience.length > 0 ? workExperience[0] : null;
  const skills: StudentSkills = {
    technicalSkills: toTrimmedStringArray(formValue.technicalSkills.map((s) => s.skill).filter(Boolean)),
    softSkills: toTrimmedStringArray(Array.from(formValue.softSkills).filter(Boolean)),
    proficiencyLevel: toTrimmedString(
      formValue.technicalSkills.length > 0 ? formValue.technicalSkills[0].proficiency : '',
    ),
    languagesKnown: toTrimmedStringArray(Array.from(formValue.languagesKnown).filter(Boolean)),
    jobRolesOfInterest: formValue.workPreferences.jobRolesInterested
      ? [toTrimmedString(formValue.workPreferences.jobRolesInterested)]
      : [],
    preferredLocation: formValue.workPreferences.preferredLocation
      ? [toTrimmedString(formValue.workPreferences.preferredLocation)]
      : [],
    availability: formValue.workPreferences.availabilityToStart
      ? [toTrimmedString(formValue.workPreferences.availabilityToStart)]
      : [],
    expectedSalary: toTrimmedString(formValue.workPreferences.expectedSalary),
    employmentType: mapEmploymentType(formValue.workPreferences),
    companyName: toTrimmedString(latestWorkExp?.companyName),
    role: toTrimmedString(latestWorkExp?.role),
    startDate: toTrimmedString(latestWorkExp?.startDate),
    endDate: toTrimmedString(latestWorkExp?.endDate),
    currentlyWorking: latestWorkExp?.currentlyWorkingHere ?? false,
  };

  const mappedProjects: StudentProject[] = projects.map((p) => ({
    userId: toTrimmedString(userId),
    projectName: toTrimmedString(p.projectName),
    description: toTrimmedString(p.description),
    technologiesUsed: toTrimmedStringArray(Array.from(p.technologiesUsed).filter(Boolean)),
    projectUrl: toTrimmedString(p.projectUrl),
    githubUrl: toTrimmedString(p.githubUrl),
  }));

  const skillsAndExperience: StudentSkillsAndExperience = {
    skills,
    projects: mappedProjects,
  };

  const additionalInfo: StudentAdditionalInfo = {
    govtIdProofUrl: toTrimmedString(formValue.additional.govtIdProofFiles?.item(0)?.name),
    portfolioUrl: toTrimmedString(formValue.additional.portfolioUrl),
    resumeUrl: toTrimmedString(formValue.additional.resumeFiles?.item(0)?.name),
    otherWebsites: toTrimmedStringArray(
      formValue.additional.otherWebsites ? [formValue.additional.otherWebsites].filter(Boolean) : [],
    ),
    offersInHand: mapYesNoToBoolean(formValue.additional.offersInHand) ?? false,
    jobAlertPreference: mapJobAlertPreference(formValue.additional.jobAlertsVia),
    howDidYouHear: toTrimmedString(formValue.additional.heardAboutPortal),
    termsAndCondition: formValue.additional.agreeToTerms ?? false,
  };

  return {
    personalInfo,
    educationDetails,
    skillsAndExperience,
    additionalInfo,
  };
}
