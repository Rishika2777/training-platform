export type YesNo = 'yes' | 'no';
export type Gender = 'male' | 'female' | 'other';

export interface StudentEducationItem {
  qualification: string;
  institution: string;
  campusId?: string; // Campus ID when institution is selected from campuses
  campusAddress?: string; // Campus address when institution is selected from campuses
  departmentId?: string;
  degree: string;
  specialization: string;
  id?: string;
  yearOfPassing: string;
  percentageOrCgpa: string;
  certificateFiles: FileList | null;
  certificateFileNames: readonly string[];
}

export interface StudentTechnicalSkillItem {
  skill: string;
  proficiency: string; // keep as string; backend parsing can be done later
}

export interface StudentWorkExperienceItem {
  companyName: string;
  role: string;
  startDate: string;
  endDate: string;
  currentlyWorkingHere: boolean;
}

export interface StudentProjectItem {
  projectName: string;
  description: string;
  technologiesUsed: readonly string[];
}

export interface StudentWorkPreferences {
  jobRolesInterested: string;
  preferredLocation: string;
  availabilityToStart: string;
  expectedSalary: string;
  employmentType: {
    internship: boolean;
    fullTime: boolean;
    both: boolean;
  };
}

export interface StudentAdditionalInfo {
  govtIdProofFiles: FileList | null;
  govtIdProofUrl?: string; // URL of existing govt ID proof from API
  resumeFiles: FileList | null;
  resumeUrl?: string; // URL of existing resume from API
  certificateFiles: FileList | null;
  certificateFileNames: readonly string[];
  portfolioUrl: string;
  otherWebsites: string;
  offersInHand: YesNo | null;
  heardAboutPortal: string;
  jobAlertsVia: string;
  agreeToTerms: boolean;
}

export interface StudentFormValue {
  // Existing minimal fields used by current API call:
  fullName: string;
  email: string;

  // Multi-step fields:
  firstName: string;
  lastName: string;
  photoFiles: FileList | null;
  photoUrl?: string; // URL of existing photo from API
  dateOfBirth: string;
  gender: Gender | null;
  mobile: string;
  address: string;
  profileSummary: string;

  education: StudentEducationItem[];
  technicalSkills: StudentTechnicalSkillItem[];
  softSkills: readonly string[];
  languagesKnown: readonly string[];
  workPreferences: StudentWorkPreferences;
  workExperience: StudentWorkExperienceItem[];
  projects: StudentProjectItem[];
  additional: StudentAdditionalInfo;
}
