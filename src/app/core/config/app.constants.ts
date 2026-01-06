  import { InjectionToken } from '@angular/core';

  export interface AppConfig {
    APP_NAME: string;
    VERSION: string;
    API_BASE_URL: string;
    STUDENT_API_BASE_URL: string;
    CAMPUS_API_BASE_URL: string;
    COMPANY_API_BASE_URL: string;
    SWAGGER_DOCS_URL: string;
    DEFAULT_PAGE_SIZE: number;
    MAX_PAGE_SIZE: number;
    CLEAR_CACHE_ON_START: boolean;
  }

  export const APP_CONFIG: AppConfig = {
    APP_NAME: 'Synkup CRM',
    VERSION: '1.0.0',
    // Use same-origin base to support SSR/proxying like the legacy app
    API_BASE_URL: '/api/v1',
    STUDENT_API_BASE_URL: '/api/v1',
    CAMPUS_API_BASE_URL: '/api/v1',
    COMPANY_API_BASE_URL: '/api/v1',
    SWAGGER_DOCS_URL: 'http://13.234.201.92:8081/api/v1/swagger-ui/index.html',
    DEFAULT_PAGE_SIZE: 10,
    MAX_PAGE_SIZE: 100,
    CLEAR_CACHE_ON_START: false,
  };

  /**
   * Backend "userType" (drives UX: menu selection, home route, etc).
   * Example: userType="STUDENT", roles=["STUDENT"].
   */
  export type UserType = 'CAMPUS' | 'COMPANY' | 'STUDENT';

  /**
   * Backend "roles" used for authorization/guards.
   */
  export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'CAMPUS_ADMIN' | 'COMPANY_ADMIN' | 'STUDENT' | 'USER';

  export type EnumLoginStatus = 'PENDING_REGISTRATION' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

  export const LOGIN_STATUS: Readonly<Record<Uppercase<EnumLoginStatus>, EnumLoginStatus>> = {
    PENDING_REGISTRATION: 'PENDING_REGISTRATION',
    PENDING_APPROVAL: 'PENDING_APPROVAL',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
  } as const;
  
  export const USER_ROLES: Readonly<Record<Uppercase<UserRole>, UserRole>> = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    ADMIN: 'ADMIN',
    CAMPUS_ADMIN: 'CAMPUS_ADMIN',
    STUDENT: 'STUDENT',
    COMPANY_ADMIN: 'COMPANY_ADMIN',
    USER: 'USER',
  } as const;

  export const ROLE_HIERARCHY: Readonly<Record<UserRole, number>> = {
    SUPER_ADMIN: 100,
    ADMIN: 80,
    CAMPUS_ADMIN: 60,
    COMPANY_ADMIN: 40,
    STUDENT: 20,
    USER: 10,
  } as const;

  export const ROUTES = {
    ROOT: '/',
    LOGIN: '/login',
    REGISTER: '/register',
    REGISTER_OPTIONS: '/register-options',
    REGISTER_CAMPUS: '/register-campus',
    REGISTER_STUDENT: '/register-student',
    REGISTER_COMPANY: '/register-company',
  } as const;

  export const STORAGE_KEYS = {
    AUTH_TOKEN: 'crm_auth_token',
    REFRESH_TOKEN: 'crm_refresh_token',
    USER_DATA: 'crm_user_data',
    MENU_CONFIG: 'crm_menu_config',
    COMPANY_ID: 'crm_company_id',
    CAMPUS_ID: 'crm_campus_id',
    STUDENT_ID: 'crm_student_id',
  } as const;

  export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

  export type ApiEndpoint = `/${string}`;

  export const API_ENDPOINTS = {
    AUTH: {
      VERIFY_EMAIL: '/auth/verify-email',
      VERIFY_OTP: '/auth/verify-otp',
    RESEND_OTP: '/auth/resend-otp',
      ME: '/auth/me',
      LOGIN: '/auth/login',
      LOGOUT: '/auth/logout',
      REGISTER: '/auth/register',
      REFRESH_TOKEN: '/auth/refresh-token',
      FORGOT_PASSWORD: '/auth/forgot-password',
      RESET_PASSWORD: '/auth/reset-password',
      SELECT_USER_TYPE: '/auth/select-user-type',
      PROFILE_COMPLETE: '/auth/profile/complete',
    },
    STUDENT: {
      BASE: '/student',
      REGISTER: '/student/register',
      FULL_PROFILE: '/student/:studentId/profile',
      PUBLIC_PROFILE: '/student/:studentId/public-profile',
      RESUME_URL: '/student/:studentId/resume',
      APPROVAL_STATUS_BY_STUDENT_ID: '/student/:studentId/approval-status',
      APPROVAL_STATUS_BY_USER_ID: '/student/approval-status',
      UPDATE_FULL_PROFILE: '/student/:studentId/update',
      UPDATE_APPROVAL_STATUS: '/student/:studentId/approvalStatus/update',
      UPDATE_SKILLS: '/student/:studentId/skills',
      UPDATE_EDUCATION: '/student/:studentId/education',
      UPDATE_ADDITIONAL_INFO: '/student/:studentId/additional-info',
      CREATE_PROJECT: '/student/:studentId/addProjects',
      UPDATE_PROJECT: '/student/:projectId',
      DELETE_PROJECT: '/student/:projectId',
      PROJECTS_BY_STUDENT_ID: '/student/:studentId/projects',
      MY_PROJECTS: '/student/me/projects',
      ALUMNI: '/students/:studentId/alumni',
      TESTIMONIALS: '/student/:studentId/testimonials',
      FEEDBACK: '/student/:studentId/feedback',
      CAREER_CHECKIN: '/student/career-checkin',
      IDEA_SUBMIT: '/student/ideas/submit',
      IDEA_TEMPLATE: '/student/ideas/template',
      BATCHMATES: '/batchmates/:studentId/batchmates',
      PLACED_STUDENTS: '/placed-students',
      ALL_STUDENTS: '/student/students',
      DELETE: '/student/students/:studentId',
    },
    COMPANY: {
      BASE: '/company',
      REGISTER: '/company/register',
      GET_ALL: '/company/company/all',
      BY_ID: '/company/:companyId',
      UPDATE: '/company/:companyId/update',
      UPDATE_APPROVAL_STATUS: '/company/:companyId/approvalStatus/update',
      APPROVAL_STATUS: '/company/:companyId/approval-status',
      DELETE: '/company/delete/:companyId',
    },
    CAMPUS: {
      BASE: '/campus',
      REGISTER: '/campus/register',
      GET_ALL: '/campus/getAll',
      BY_ID: '/campus/:campusId',
      UPDATE: '/campus/:campusId/update',
      UPDATE_BY_ADMIN: '/campus/admin/:campusId',
      // Swagger: DELETE /campus/admin/{campusId}
      DELETE: '/campus/admin/:campusId',
      APPROVAL: '/campus/:campusId/approval',
      ADD_PLACED_STUDENT: '/dashboard/students/placed',
      GET_PLACED_STUDENTS: '/dashboard/students/placed',
      GET_ALL_BATCHES: '/dashboard/students/batches',
      GET_STUDENTS_BY_BATCH: '/dashboard/students/batch',
      ADD_COMPANY_VISITED: '/dashboard/companies/visited',
      ADD_COURSE: '/dashboard/courses',
      GET_SECTORS: '/dashboard/meta/sectors',
      GET_DESIGNATIONS: '/dashboard/meta/designations',
      GET_COURSES: '/dashboard/meta/courses',
      GET_BATCHES: '/dashboard/meta/batches',
      ADD_FACULTY: '/faculty',
      GET_ALL_FACULTY: '/faculty',
      GET_FACULTY_BY_ID: '/faculty/:facultyId',
      GET_FACULTY_PROFILE: '/faculty/:facultyId/profile',
      UPDATE_FACULTY: '/faculty/:facultyId',
      DELETE_FACULTY: '/faculty/:facultyId',
      CHECK_FACULTY_EMAIL: '/faculty/check-email',
      UPLOAD_PROSPECTUS: '/prospectus/upload',
      GET_PROSPECTUS_BY_CAMPUS: '/prospectus/campus/:campusId',
      GET_PROSPECTUS_BY_COURSE: '/prospectus/course/:courseId',
      GET_PROSPECTUS_BY_ID: '/prospectus/:prospectusId',
      DOWNLOAD_PROSPECTUS: '/prospectus/download',
      DELETE_PROSPECTUS: '/prospectus/:prospectusId',
      RISING_STARS: '/public/landing/campus/:campusId/rising-stars',
      SUCCESS_STORIES: '/public/landing/campus/:campusId/success-stories',
      FACULTIES: '/public/landing/campus/:campusId/faculties',
      TESTIMONIALS: '/public/landing/campus/:campusId/testimonials',
      RESEARCH: '/public/landing/campus/:campusId/research',
      ALUMNI: '/public/landing/campus/:campusId/alumni',
      COURSES: '/public/landing/campus/:campusId/courses',
      PLACEMENT_INSIGHTS: '/public/landing/campus/:campusId/placement-insights',
      ABOUT_SYNKUP: '/public/landing/about',
    },
    USERS: {
      BASE: '/users',
      VERIFY: '/users/:userId/verify',
      STATUS: '/users/:userId/status',
      PASSWORD: '/users/:userId/password',
      BY_TYPE: '/users/type/:userType',
      PAGED: '/users/paged',
      BY_EMAIL: '/users/email/:email',
      ACTIVE: '/users/active',
    },
    ADMIN: {
      APPROVE_STUDENT: '/admin/student/:studentId/approval',
      APPROVE_COMPANY: '/admin/company/:companyId/approval',
      APPROVE_CAMPUS: '/admin/campus/:campusId/approval',
      PENDING_APPROVALS: '/admin/approvals/pending',
    },
  } as const satisfies Record<string, Record<string, ApiEndpoint>>;

  export const APP_CONFIG_TOKEN = new InjectionToken<AppConfig>('APP_CONFIG');
  export const API_ENDPOINTS_TOKEN = new InjectionToken<typeof API_ENDPOINTS>('API_ENDPOINTS');


