import type { StudentFormValue, StudentWorkPreferences } from '../../../shared/components/forms/student-form/student-form.models';

export interface CampusResponse {
  campusId?: string;
  campusName?: string;
  campusLogoUrl?: string;
  campusRank?: number;
  adminName?: string;
  adminEmail?: string;
  adminPhone?: string;
  websiteUrl?: string;
  aboutCampus?: string;
  campusAddress?: string;
  approvalStatus?: string;
}

export interface ApiResponseCampusResponse {
  success?: boolean;
  message?: string;
  data?: CampusResponse[];
  error?: string;
  statusCode?: number;
  timestamp?: string;
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
  campusId?: string[];
  campusAddress?: string[];
  departmentId?: string[];
  other?: boolean;
  degrees: string[];
  specializations: string[];
  /** One year per education item (same order as qualifications/specializations). */
  yearOfPassing?: string | string[];
  certificates?: string[];
  /** One value per education item (same order as qualifications/specializations). */
  cgpa?: string | string[];
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
  jobAlertPreference?: 'NONE' | 'EMAIL' | 'SMS' | 'BOTH';
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
  email?: string;
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

export interface StudentPublicProfileResponse {
  studentId?: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth?: string;
  profilePhotoUrl?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  about?: string;
  campusName?: string;
  batch?: string;
  rank?: string;
  resumeUrl?: string;
  projects?: ProjectResponse[];
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  [key: string]: unknown;
  institutionName?: string[];
}

export interface ApiResponseStudentPublicProfileResponse {
  success?: boolean;
  message?: string;
  data?: StudentPublicProfileResponse;
  error?: string;
  statusCode?: number;
  timestamp?: string;
}

export interface TestimonialResponse {
  content?: string;
  author?: string;
  [key: string]: unknown;
}

export interface ApiResponseTestimonialResponse {
  success?: boolean;
  message?: string;
  data?: { content?: TestimonialResponse[]; totalElements?: number; totalPages?: number };
  error?: string;
  statusCode?: number;
  timestamp?: string;
}

export interface PromotionCountResponse {
  promotionCount?: number;
  [key: string]: unknown;
}

export interface ApiResponsePromotionCountResponse {
  success?: boolean;
  message?: string;
  data?: PromotionCountResponse;
  error?: string;
  statusCode?: number;
  timestamp?: string;
}

export interface FollowerCountResponse {
  studentId?: string;
  publicStudentId?: string;
  followerCount?: number;
}

export interface ApiResponseFollowerCountResponse {
  success?: boolean;
  message?: string;
  data?: FollowerCountResponse;
  error?: string;
  statusCode?: number;
  timestamp?: string;
}

export interface KnowledgeBaseResponse {
  studentId?: string;
  publicStudentId?: string;
  xaxisLabels?: string[];
  yaxisValues?: number[];
}

export interface ApiResponseKnowledgeBaseResponse {
  success?: boolean;
  message?: string;
  data?: KnowledgeBaseResponse;
  error?: string;
  statusCode?: number;
  timestamp?: string;
}

export interface AlumniResponse {
  studentId?: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  profilePhotoUrl?: string;
  designation?: string;
  companyName?: string;
  yearOfPassing?: string;
}

export interface BatchmateResponse {
  studentId?: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  profilePhotoUrl?: string;
  batch?: string;
  yearOfPassing?: string;
}

export interface PlacedStudentResponse {
  id?: string;
  userId?: string | null;
  campusId?: string;
  courseId?: string | null;
  courseName?: string;
  studentName?: string;
  photoUrl?: string;
  batch?: string;
  rollNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  placementCompanyId?: string | null;
  placementCompanyName?: string;
  placementDate?: string;
  designation?: string;
  sector?: string;
  createdAt?: string;
  updatedAt?: string;
  placed?: boolean;
  // Legacy fields for backward compatibility
  studentId?: string;
  firstName?: string;
  lastName?: string;
  profilePhotoUrl?: string;
  companyName?: string;
  lpa?: string;
}

export interface PageAlumniResponse {
  totalPages?: number;
  totalElements?: number;
  first?: boolean;
  last?: boolean;
  size?: number;
  content?: AlumniResponse[];
  number?: number;
  numberOfElements?: number;
  empty?: boolean;
}

export interface PagePlacedStudentResponse {
  totalPages?: number;
  totalElements?: number;
  first?: boolean;
  last?: boolean;
  size?: number;
  content?: PlacedStudentResponse[];
  number?: number;
  numberOfElements?: number;
  empty?: boolean;
}

export interface ApiResponsePageAlumniResponse {
  success?: boolean;
  message?: string;
  data?: PageAlumniResponse;
  error?: string;
  statusCode?: number;
  timestamp?: string;
}

export interface ApiResponseBatchmateResponse {
  success?: boolean;
  message?: string;
  data?: BatchmateResponse[];
  error?: string;
  statusCode?: number;
  timestamp?: string;
}

export interface ApiResponsePlacedStudentsResponse {
  success?: boolean;
  message?: string;
  data?: PagePlacedStudentResponse;
  error?: string;
  statusCode?: number;
  timestamp?: string;
}

export interface PageStudent {
  totalPages?: number;
  totalElements?: number;
  first?: boolean;
  last?: boolean;
  size?: number;
  content?: PlacedStudentResponse[];
  number?: number;
  numberOfElements?: number;
  empty?: boolean;
}

export interface ApiResponsePageStudent {
  success?: boolean;
  message?: string;
  data?: PageStudent;
  error?: string;
  statusCode?: number;
  timestamp?: string;
}

export interface CareerCheckInRequest {
  companyName: string;
  jobTitle: string;
  startDate: string;
  endDate: string;
  isCurrentlyWorking: boolean;
  recnHelped: boolean;
}

export interface CareerCheckInResponse {
  careerCheckInId?: string;
  userId?: string;
  companyName: string;
  jobTitle: string;
  startDate: string;
  endDate?: string;
  isCurrentlyWorking: boolean;
  recnHelped: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiResponseCareerCheckInResponse {
  success?: boolean;
  message?: string;
  data?: CareerCheckInResponse;
  error?: string;
  statusCode?: number;
  timestamp?: string;
}

export interface StudentFeedbackRequest {
  reviewerName: string;
  feedbackText: string;
}

export interface StudentFeedbackResponse {
  feedbackId?: string;
  studentId?: string;
  reviewerName?: string;
  feedbackText?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ApiResponseFeedbackResponse {
  success?: boolean;
  message?: string;
  data?: StudentFeedbackResponse;
  error?: string;
  statusCode?: number;
}

export interface StudentRecommendationRequest {
  wouldRecommend: boolean;
}

export interface StudentRecommendationResponse {
  recommendationId?: string;
  studentId?: string;
  reviewerId?: string;
  wouldRecommend?: boolean;
  createdAt?: string | null;
}

export interface ApiResponseRecommendationResponse {
  success?: boolean;
  message?: string;
  data?: StudentRecommendationResponse;
  error?: string;
  statusCode?: number;
}

export interface ApiResponseString {
  success?: boolean;
  message?: string;
  data?: string;
  error?: string;
  statusCode?: number;
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

/** Maps form value to backend enum JobAlertPreference (NONE, EMAIL, SMS, BOTH). */
function mapJobAlertPreference(jobAlertsVia: string): 'NONE' | 'EMAIL' | 'SMS' | 'BOTH' {
  const v = (jobAlertsVia || '').trim().toUpperCase();
  if (v === 'EMAIL') return 'EMAIL';
  if (v === 'SMS') return 'SMS';
  if (v === 'BOTH') return 'BOTH';
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

function extractYearFromDate(value: string | null | undefined): string {
  const trimmed = (value ?? '').trim();
  if (!trimmed) {
    return '';
  }
  // If it's in YYYY-MM-DD format (date input), extract the year part
  if (trimmed.includes('-')) {
    const parts = trimmed.split('-');
    return parts[0] || '';
  }
  // Otherwise, assume it's already just a year string
  return trimmed;
}

export function mapStudentFormValueToRegisterRequest(
  formValue: StudentFormValue,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userId?: string,
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
    email: toTrimmedString(formValue.email).toLowerCase(),
    phoneNumber: toTrimmedString(formValue.mobile),
    // Use new file name if uploaded, otherwise use existing URL
    profilePhotoUrl: toTrimmedString(formValue.photoFiles?.item(0)?.name || formValue.photoUrl),
    address: toTrimmedString(formValue.address),
    about: toTrimmedString(formValue.profileSummary),
  };

  // Check if any education item has a custom institution (no campusId or institution is "OTHER")
  const hasOtherInstitution = education.some((e) => {
    // If institution is "OTHER" or if there's no campusId but institution exists, it's a custom institution
    return e.institution === 'OTHER' || (!e.campusId && !!e.institution);
  });

  const educationDetails: StudentEducationDetails = {
    qualifications: toTrimmedStringArray(education.map((e) => e.qualification).filter(Boolean)),
    institutionName: toTrimmedStringArray(education.map((e) => e.institution).filter(Boolean)),
    campusId: toTrimmedStringArray(education.map((e) => e.campusId || '').filter(Boolean)),
    campusAddress: toTrimmedStringArray(education.map((e) => e.campusAddress || '').filter(Boolean)),
    departmentId: toTrimmedStringArray(education.map((e) => e.departmentId || '').filter(Boolean)),
    other: hasOtherInstitution,
    degrees: toTrimmedStringArray(education.map((e) => e.degree).filter(Boolean)),
    specializations: toTrimmedStringArray(education.map((e) => e.specialization).filter(Boolean)),
    yearOfPassing: education.map((e) => extractYearFromDate(e.yearOfPassing)),
    certificates: toTrimmedStringArray(
      education.flatMap((e) => Array.from(e.certificateFileNames || [])).filter(Boolean),
    ),
    cgpa: education.map((e) => toTrimmedString(e.percentageOrCgpa)),
  };

  const latestWorkExp = workExperience.length > 0 ? workExperience[0] : null;
  const jobRolesInterestedTrimmed = toTrimmedString(formValue.workPreferences.jobRolesInterested);
  const preferredLocationTrimmed = toTrimmedString(formValue.workPreferences.preferredLocation);
  const availabilityTrimmed = toTrimmedString(formValue.workPreferences.availabilityToStart);

  const skills: StudentSkills = {
    technicalSkills: toTrimmedStringArray(formValue.technicalSkills.map((s) => s.skill).filter(Boolean)),
    softSkills: toTrimmedStringArray(Array.from(formValue.softSkills).filter(Boolean)),
    proficiencyLevel: toTrimmedString(
      formValue.technicalSkills.length > 0 ? formValue.technicalSkills[0].proficiency : '',
    ) || 'BEGINNER', // Default to BEGINNER if empty to satisfy backend requirement
    languagesKnown: toTrimmedStringArray(Array.from(formValue.languagesKnown).filter(Boolean)),
    jobRolesOfInterest: jobRolesInterestedTrimmed ? [jobRolesInterestedTrimmed] : [],
    preferredLocation: preferredLocationTrimmed ? [preferredLocationTrimmed] : [],
    availability: availabilityTrimmed ? [availabilityTrimmed] : [],
    expectedSalary: toTrimmedString(formValue.workPreferences.expectedSalary),
    employmentType: mapEmploymentType(formValue.workPreferences),
    companyName: toTrimmedString(latestWorkExp?.companyName),
    role: toTrimmedString(latestWorkExp?.role),
    startDate: toTrimmedString(latestWorkExp?.startDate),
    endDate: toTrimmedString(latestWorkExp?.endDate),
    currentlyWorking: latestWorkExp?.currentlyWorkingHere ?? false,
  };

  const mappedProjects: StudentProject[] = projects.map((p) => ({
    projectName: toTrimmedString(p.projectName),
    description: toTrimmedString(p.description),
    technologiesUsed: toTrimmedStringArray(Array.from(p.technologiesUsed).filter(Boolean)),
  }));

  const skillsAndExperience: StudentSkillsAndExperience = {
    skills,
    projects: mappedProjects,
  };

  const additionalInfo: StudentAdditionalInfo = {
    // Use new file name if uploaded, otherwise use existing URL
    govtIdProofUrl: toTrimmedString(formValue.additional.govtIdProofFiles?.item(0)?.name || formValue.additional.govtIdProofUrl),
    portfolioUrl: toTrimmedString(formValue.additional.portfolioUrl),
    // Use new file name if uploaded, otherwise use existing URL
    resumeUrl: toTrimmedString(formValue.additional.resumeFiles?.item(0)?.name || formValue.additional.resumeUrl),
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
