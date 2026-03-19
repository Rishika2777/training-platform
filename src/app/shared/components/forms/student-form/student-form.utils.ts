import type {
  StudentAdditionalInfo,
  StudentEducationItem,
  StudentFormValue,
  StudentProjectItem,
  StudentWorkExperienceItem,
  StudentWorkPreferences,
} from './student-form.models';

export function createEmptyStudentFormValue(seed?: Partial<StudentFormValue>): StudentFormValue {
  const base: StudentFormValue = {
    fullName: '',
    email: '',

    firstName: '',
    lastName: '',
    photoFiles: null,
    photoUrl: undefined,
    dateOfBirth: '',
    gender: null,
    mobile: '',
    address: '',
    profileSummary: '',

    education: [createEmptyEducationItem()],
    technicalSkills: [],
    softSkills: [],
    languagesKnown: [],
    workPreferences: createEmptyWorkPreferences(),
    workExperience: [createEmptyWorkExperienceItem()],
    projects: [createEmptyProjectItem()],
    additional: createEmptyAdditionalInfo(),
  };

  return { ...base, ...seed };
}

export function createEmptyEducationItem(): StudentEducationItem {
  return {
    qualification: '',
    institution: '',
    degree: '',
    specialization: '',
    yearOfPassing: '',
    percentageOrCgpa: '',
    certificateFiles: null,
    certificateFileNames: [],
  };
}

export function createEmptyWorkPreferences(): StudentWorkPreferences {
  return {
    jobRolesInterested: '',
    preferredLocation: '',
    availabilityToStart: '',
    expectedSalary: '',
    employmentType: { internship: false, fullTime: false, both: false },
  };
}

export function createEmptyWorkExperienceItem(): StudentWorkExperienceItem {
  return { companyName: '', role: '', startDate: '', endDate: '', currentlyWorkingHere: false };
}

export function createEmptyProjectItem(): StudentProjectItem {
  return { projectName: '', description: '', technologiesUsed: [] };
}

export function createEmptyAdditionalInfo(): StudentAdditionalInfo {
  return {
    govtIdProofFiles: null,
    resumeFiles: null,
    certificateFiles: null,
    certificateFileNames: [],
    portfolioUrl: '',
    otherWebsites: '',
    offersInHand: null,
    heardAboutPortal: '',
    jobAlertsVia: '',
    agreeToTerms: false,
  };
}
