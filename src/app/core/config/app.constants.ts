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
export type UserType = 'CAMPUS' | 'COMPANY' | 'STUDENT' | 'DEPARTMENT';

/**
 * Backend "roles" used for authorization/guards.
 */
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'CAMPUS_ADMIN' | 'COMPANY_ADMIN' | 'STUDENT' | 'USER' | 'DEPARTMENT';

export type EnumLoginStatus = 'PENDING_REGISTRATION' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export const LOGIN_STATUS: Readonly<Record<Uppercase<EnumLoginStatus>, EnumLoginStatus>> = {
  PENDING_REGISTRATION: 'PENDING_REGISTRATION',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

/** Shared approval filter options for admin dropdowns (Student, Campus, Company). */
export const APPROVAL_FILTER_ITEMS: readonly { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Pending Approval', value: 'PENDING_APPROVAL' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
] as const;

export const USER_ROLES: Readonly<Record<Uppercase<UserRole>, UserRole>> = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  CAMPUS_ADMIN: 'CAMPUS_ADMIN',
  STUDENT: 'STUDENT',
  COMPANY_ADMIN: 'COMPANY_ADMIN',
  USER: 'USER',
  DEPARTMENT: 'DEPARTMENT',
} as const;

export const ROLE_HIERARCHY: Readonly<Record<UserRole, number>> = {
  SUPER_ADMIN: 100,
  ADMIN: 80,
  CAMPUS_ADMIN: 60,
  COMPANY_ADMIN: 40,
  STUDENT: 20,
  USER: 10,
  DEPARTMENT: 55,
} as const;

export const ROUTES = {
  ROOT: '/',
  LOGIN: '/login',
  RESET_PASSWORD: '/reset-password',
  REGISTER: '/register',
  REGISTER_OPTIONS: '/register/options',
  REGISTER_CAMPUS: '/register/campus',
  REGISTER_STUDENT: '/register/student',
  REGISTER_COMPANY: '/register/company',
} as const;

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'crm_auth_token',
  REFRESH_TOKEN: 'crm_refresh_token',
  USER_DATA: 'crm_user_data',
  MENU_CONFIG: 'crm_menu_config',
  COMPANY_ID: 'crm_company_id',
  CAMPUS_ID: 'crm_campus_id',
  DEPARTMENT_ID: 'crm_department_id',
  STUDENT_ID: 'crm_student_id',
  ADMIN_AUDIT_LOG: 'crm_admin_audit_log',
  REGISTRATION_DRAFT: 'crm_registration_draft',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export type ApiEndpoint = `/${string}`;

export const API_ENDPOINTS = {
  AUTH: {
    VERIFY_EMAIL: '/auth/verify-email',
    VERIFY_OTP: '/auth/verify-otp',
    RESEND_OTP: '/auth/resend-otp',
    VERIFY_PHONE: '/auth/verify-phone',
    ME: '/auth/me',
    LOGIN: '/auth/login',
    GOOGLE: '/auth/google',
    LOGOUT: '/auth/logout',
    REGISTER: '/auth/register',
    REFRESH_TOKEN: '/auth/refresh-token',
    FORGOT_PASSWORD: '/auth/forget-password',
    RESET_PASSWORD: '/auth/reset-password',
    RESET_PASSWORD_BY_USER_ID: '/auth/reset-password/:userId',
    SELECT_USER_TYPE: '/auth/select-user-type',
    PROFILE_COMPLETE: '/auth/profile/complete',
  },
  COMMON: {
    AUTOSEARCH: '/common/search/autosearch',
    FOLLOW: '/common/follow',
    CREATE_POST: '/common/feed/posts',
    CREATE_ANNOUNCEMENT: '/common/feed/announcements',
    GET_FEED: '/common/feed',
    GET_ANNOUNCEMENTS: '/common/feed/announcements',
    GET_ANNOUNCEMENT: '/common/feed/announcements/:postId',
    UPDATE_ANNOUNCEMENT: '/common/feed/announcements/:postId',
    GET_POST: '/common/feed/posts/:postId',
    UPDATE_POST: '/common/feed/posts/:postId',
    LIKE_POST: '/common/feed/posts/:postId/like',
    GET_POST_LIKES: '/common/feed/posts/:postId/likes',
    REPORT_POST: '/common/feed/posts/report',
    DELETE_POST: '/common/feed/posts/:postId',
    DELETE_ANNOUNCEMENT: '/common/feed/announcements/:postId',
  },
  NOTIFICATIONS: {
    STREAM: '/notifications/stream',
    LIST: '/notifications',
    UNREAD_COUNT: '/notifications/unread-count',
    MARK_READ: '/notifications/:id/read',
    MARK_ALL_READ: '/notifications/read-all',
  },
  STUDENT: {
    BASE: '/student',
    REGISTER: '/student/register',
    GET_REGISTERED_CAMPUSES: '/campuses',
    FULL_PROFILE: '/student/:studentId/profile',
    PUBLIC_PROFILE: '/student/:studentId/public-profile',
    RESUME_URL: '/student/:studentId/resume',
    APPROVAL_STATUS_BY_STUDENT_ID: '/student/:studentId/approval-status',
    APPROVAL_STATUS_BY_USER_ID: '/student/approval-status',
    UPDATE_FULL_PROFILE: '/student/:studentId/update',
    UPDATE_APPROVAL_STATUS: '/student/:studentId/approval-Status/update',
    UPDATE_SKILLS: '/student/:studentId/skills',
    UPDATE_EDUCATION: '/student/:studentId/education',
    UPDATE_ADDITIONAL_INFO: '/student/:studentId/additional-info',
    CREATE_PROJECT: '/student/:studentId/addProjects',
    UPDATE_PROJECT: '/student/:projectId',
    DELETE_PROJECT: '/student/:projectId',
    PROJECTS_BY_STUDENT_ID: '/student/:studentId/projects',
    MY_PROJECTS: '/student/me/projects',
    ALUMNI: '/students/:studentId/alumni',
    CURRENT_BATCH: '/student/batch/current',
    ALUMNI_BY_CAMPUS_BATCH: '/students/campus/:campusId/batch',
    TESTIMONIALS: '/student/:studentId/testimonials',
    FEEDBACK: '/student/:studentId/feedback',
    RECOMMENDATION: '/recommendation/:studentId',
    CAREER_CHECKIN: '/student/career-checkin',
    IDEA_SUBMIT: '/student/ideas/submit',
    IDEA_TEMPLATE: '/student/ideas/template',
    IDEA_SUBMISSION: '/students/:studentId/ideas',
    IDEA_TEMPLATE_INFO: '/students/:studentId/ideas/template',
    BATCHMATES: '/student/:studentId/myBatchmates',
    PLACED_STUDENTS: '/placed-students',
    ALL_STUDENTS: '/student/students/all',
      BULK_UPLOAD: '/admin/students/bulk-upload',
    GET_STUDENTS_BY_CAMPUS: '/student/campus/:campusId',
    GET_STUDENT_CAMPUS_BATCH_INFO: '/student/:studentId/campus/:campusId/batch-info',
    DELETE: '/student/delete/:studentId',
    FOLLOW: '/follower/follow',

    PUBLIC_LANDING_TESTIMONIALS: '/public-landing/:publicStudentId/testimonials',
    PUBLIC_LANDING_STUDENT_PROFILE: '/public-landing/:publicStudentId/student-profile',
    PUBLIC_LANDING_PROMOTIONS: '/public-landing/:publicStudentId/promotions',
    PUBLIC_LANDING_FOLLOWERS: '/public-landing/:publicStudentId/followers',
    PUBLIC_LANDING_ALUMNI: '/public-landing/:publicStudentId/alumni',
    PUBLIC_LANDING_KNOWLEDGE_BASE: '/public-landing/:publicStudentId/overview/knowledge-base',
  },
  COMPANY: {
    BASE: '/company',
    REGISTER: '/company/register',
    BULK_UPLOAD: '/company/bulk-upload',
    GET_ALL: '/company/companies/all',
    BY_ID: '/company/:companyId',
    UPDATE: '/company/update/:companyId',
    UPDATE_APPROVAL_STATUS: '/company/approvalStatus/update/:companyId',
    APPROVAL_STATUS: '/company/:companyId/approval-status',
    DELETE: '/company/delete/:companyId',
    SUBMIT_FEEDBACK: '/company/:companyId/feedback',
    GET_KEY_PEOPLE: '/company-landing/:companyId/key-people',
    GET_TARGET_CAMPUSES: '/company-landing/:companyId/target-campuses',
    GET_PREFERRED_CAMPUSES: '/preferred-campus/:companyId/campuses',
    ADD_PREFERRED_CAMPUS: '/preferred-campus/:companyId/addCampus',
    GET_CLIENTS: '/clients/:companyId/clients',
    ADD_CLIENT: '/clients/:companyId/clients',
    GET_SPECIALIZATIONS: '/specializations/:companyId/technologies',
    ADD_SPECIALIZATION: '/specializations/:companyId/technologies/:technologyId',
    ADD_TECHNOLOGY: '/specializations/:companyId/technology',
    DELETE_TECHNOLOGY: '/specializations/:companyId/technologies/:technologyId',
    ADD_VISION_PERFORMANCE: '/vision/:companyId',
    GET_COMPANY_BY_SEARCH: '/company/getCompanyBySearch',
    ADD_VACANCY: '/vacancy',
    GET_VACANCIES: '/vacancy/company/:companyId',
      DELETE_VACANCY: '/vacancy/:vacancyId',
    APPLY_VACANCY: '/apply/vacancy/:vacancyId',
    ADD_BENEFITS_OFFER: '/benefits-offer/:companyId',
    GET_BENEFITS_OFFER: '/company-landing/:companyId/benefits-offer',
    GET_OVERVIEW_STATS: '/company-landing/:companyId/overview/stats',
    FOLLOW: '/follower/follow',
    GET_FOLLOWERS_COUNT: '/company-landing/:companyId/followers',
    PROMOTIONS_COUNT: '/company-landing/:companyId/promotions',
    SUBMIT_INVITATION: '/company-invitation',
     SUBMIT_RECOMMENDATION: '/recommendation/:companyId',
    GET_TESTIMONIALS: '/company/:companyId/testimonials',
    // ---------------- PUBLIC COMPANY LANDING ----------------
    PUBLIC_GET_VISION: '/public-landing/:publicCompanyId/vision',
    PUBLIC_GET_VACANCIES: '/public-landing/:publicCompanyId/vacancies',
    PUBLIC_GET_TESTIMONIALS: '/public-landing/:publicCompanyId/testimonials',
    PUBLIC_GET_TARGET_CAMPUSES: '/public-landing/:publicCompanyId/target-campuses',
    PUBLIC_GET_PROMOTIONS: '/public-landing/:publicCompanyId/promotions',
    PUBLIC_GET_KEY_PEOPLE: '/public-landing/:publicCompanyId/key-people',
    PUBLIC_GET_FOLLOWERS: '/public-landing/:publicCompanyId/followers',
    PUBLIC_GET_COMPANY_PROFILE: '/public-landing/:publicCompanyId/company-profile',
    PUBLIC_GET_CLIENTS: '/public-landing/:publicCompanyId/clients',
    PUBLIC_GET_BENEFITS_OFFER: '/public-landing/:publicCompanyId/benefits-offer',

  },
  CAMPUS: {
    BASE: '/campus',
    REGISTER: '/campus/register',
    GET_ALL: '/campus/getAll',
    GET_CAMPUS_BY_SEARCH: '/campus/getCampusBySearch',
    BY_ID: '/campus/:campusId',
    UPDATE: '/campus/:campusId/update',
    UPDATE_BY_ADMIN: '/campus/admin/:campusId',
    // Swagger: DELETE /campus/admin/{campusId}
    DELETE: '/campus/admin/:campusId',
    APPROVAL: '/campus/:campusId/approval',
    BULK_UPLOAD: '/campus/bulk-upload',
    ADD_PLACED_STUDENT: '/dashboard/:campusId/students/placed',
    GET_PLACED_STUDENTS: '/dashboard/:campusId/placed-students',
    GET_ALL_BATCHES: '/dashboard/students/batches',
    GET_STUDENTS_BY_BATCH: '/dashboard/campus/:campusId/students/batch',
    ADD_COMPANY_VISITED: '/dashboard/campus/:campusId/companies',
    GET_COMPANIES_VISITED: '/dashboard/:campusId/companies',
    ADD_COURSE: '/campus/:campusId/courses',
    GET_ALL_COURSES: '/campus/:campusId/courses',
    GET_COURSE_BY_ID: '/campus/:campusId/courses/:courseId',
    CHECK_COURSE_NAME: '/campus/:campusId/courses/check-name',
    DELETE_COURSE: '/campus/:campusId/courses/:courseId',
    GET_SECTORS: '/dashboard/meta/sectors',
    GET_DESIGNATIONS: '/dashboard/meta/designations',
    GET_COURSES: '/dashboard/meta/courses',
    GET_BATCHES: '/dashboard/meta/batches',
    GET_ANNOUNCEMENTS: '/dashboard/announcements',
    GET_SYNKUP_ANNOUNCEMENTS: '/dashboard/announcements/synkup',
    GET_ALUMNI: '/dashboard/alumni',
    GET_ALUMNI_CAROUSEL: '/dashboard/alumni/carousel',
    GET_CAMPUS_SIDEBAR: '/dashboard/campus/:campusId/sidebar',
    ADD_FACULTY: '/campus/:campusId/faculty',
    GET_ALL_FACULTY: '/campus/:campusId/faculty',
    GET_FACULTY_BY_ID: '/campus/:campusId/faculty/:facultyId',
    GET_FACULTY_PROFILE: '/campus/:campusId/faculty/:facultyId/profile',
    UPDATE_FACULTY: '/campus/:campusId/faculty/:facultyId',
    DELETE_FACULTY: '/campus/:campusId/faculty/:facultyId',
    CHECK_FACULTY_EMAIL: '/campus/:campusId/faculty/check-email',
    UPLOAD_PROSPECTUS: '/campus/:campusId/prospectus/upload',
    GET_PROSPECTUS_BY_CAMPUS: '/campus/:campusId/prospectus',
    GET_PROSPECTUS_BY_COURSE: '/campus/:campusId/prospectus/course',
    GET_PROSPECTUS_BY_ID: '/campus/:campusId/prospectus/:prospectusId',
    DOWNLOAD_PROSPECTUS: '/campus/:campusId/prospectus/download',
    DELETE_PROSPECTUS: '/campus/:campusId/prospectus/:prospectusId',
    PUBLIC_CAMPUS_BY_ID: '/public/landing/campus/:campusId',
    CAMPUSES_CAROUSEL: '/public/landing/campuses/carousel',
    COMPANIES_CAROUSEL: '/public/landing/companies/carousel',
    RISING_STARS: '/public/landing/campus/:campusId/rising-stars',
    SUCCESS_STORIES: '/public/landing/campus/:campusId/success-stories',
    FACULTIES: '/public/landing/campus/:campusId/faculties',
    TESTIMONIALS: '/public/landing/campus/:campusId/testimonials',
    RESEARCH: '/public/landing/campus/:campusId/research',
    ALUMNI: '/public/landing/campus/:campusId/alumni',
    COURSES: '/public/landing/campus/:campusId/courses',
    PLACEMENT_INSIGHTS: '/public/landing/campus/:campusId/placement-insights',
    ANALYTICS: '/public/landing/campus/:campusId/analytics',
    ABOUT_SYNKUP: '/public/landing/about',
    ABOUT_CAMPUS: '/public/landing/campus/:campusId/about',
    FEEDBACK: '/public/landing/campus/:campusId/feedback',
    VISIT_CAMPUS: '/public/landing/campus/:campusId/visit',
       RECOMMENDATION: '/public/landing/campus/:campusId/recommendation',
    PROMOTIONS: '/public/landing/campus/:campusId/promotions',
CREATE_DEPARTMENT: '/departments/campus/:campusId',
GET_DEPARTMENTS: '/departments/campus/:campusId',
GET_ALL_DEPARTMENTS: '/departments/campus/:campusId/all',
GET_DEPARTMENT_BY_ID: '/departments/:departmentId',
DELETE_DEPARTMENT: '/departments/:departmentId',
GET_DEPARTMENT_BY_EMAIL: '/departments/by-email',
GET_DEPARTMENT_DETAIL: '/dashboard/campus/{campusId}/departments/{departmentId}',
UPDATE_DEPARTMENT: '/departments/:departmentId',
CREATE_NOTICE: '/notice-board/campus/:campusId',
GET_ALL_NOTICES: '/notice-board/campus/:campusId',
DELETE_NOTICE: '/notice-board/campus/:campusId/:noticeId',
UPDATE_NOTICE: '/notice-board/campus/:campusId/:noticeId',
GET_NOTICE_BY_ID: '/notice-board/campus/:campusId/:noticeId',



      // ---------------- PUBLIC CAMPUS LANDING ----------------
  PUBLIC_GET_ABOUT: '/guest/landing/:publicCampusId/about',
  PUBLIC_GET_TESTIMONIALS: '/guest/landing/:publicCampusId/testimonials',
  PUBLIC_GET_RISING_STARS: '/guest/landing/:publicCampusId/rising-stars',
  PUBLIC_GET_RESEARCH: '/guest/landing/:publicCampusId/research',
  PUBLIC_GET_PROMOTIONS: '/guest/landing/:publicCampusId/promotions',
  PUBLIC_GET_PLACEMENT_INSIGHTS: '/guest/landing/:publicCampusId/placement-insights',
  PUBLIC_GET_FOLLOWERS: '/guest/landing/:publicCampusId/followers',
  PUBLIC_GET_FACULTIES: '/guest/landing/:publicCampusId/faculties',
  PUBLIC_GET_COURSES: '/guest/landing/:publicCampusId/courses',
  PUBLIC_GET_CONTACT_INFO: '/guest/landing/:publicCampusId/contact-info',
  PUBLIC_GET_ALUMNI: '/guest/landing/:publicCampusId/alumni',
    
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
  CONTACT: {
    BASE: '/contact',
    CONTACT_SUPPORT: '/contact-support',
  },
NEWS: {
  BASE: '/common/news',
  CREATE: '/common/news',
  GET_BY_ID: '/common/news/:id',
  UPDATE: '/common/news/:id',
  DELETE: '/common/news/:id'
},


  ADMIN: {
    APPROVE_STUDENT: '/admin/student/:studentId/approval',
    APPROVE_COMPANY: '/admin/company/:companyId/approval',
    APPROVE_CAMPUS: '/admin/campus/:campusId/approval',
    PENDING_APPROVALS: '/admin/approvals/pending',
    DASHBOARD_USER_ENGAGEMENT: '/admin/dashboard/user-engagement',
    DASHBOARD_SUCCESSFUL_PLACEMENTS: '/admin/dashboard/successful-placements',
    DASHBOARD_REGISTERED_ENTITIES: '/admin/dashboard/registered-entities',
  },
} as const satisfies Record<string, Record<string, ApiEndpoint>>;

export const APP_CONFIG_TOKEN = new InjectionToken<AppConfig>('APP_CONFIG');
export const API_ENDPOINTS_TOKEN = new InjectionToken<typeof API_ENDPOINTS>('API_ENDPOINTS');

/**
 * Static campus data for institution dropdown
 * Used when API is not available or for offline mode
 */
export const STATIC_CAMPUSES = [
  {
    campusId: 'CAMP001',
    campusName: 'Indian Institute of Technology Delhi',
    approvalStatus: 'APPROVED',
    isEmailVerified: true,
  },
  {
    campusId: 'CAMP002',
    campusName: 'Indian Institute of Technology Bombay',
    approvalStatus: 'APPROVED',
    isEmailVerified: true,
  },
  {
    campusId: 'CAMP003',
    campusName: 'Indian Institute of Technology Madras',
    approvalStatus: 'APPROVED',
    isEmailVerified: true,
  },
  {
    campusId: 'CAMP004',
    campusName: 'Indian Institute of Technology Kanpur',
    approvalStatus: 'APPROVED',
    isEmailVerified: true,
  },
  {
    campusId: 'CAMP005',
    campusName: 'National Institute of Technology Trichy',
    approvalStatus: 'APPROVED',
    isEmailVerified: true,
  },
  {
    campusId: 'CAMP006',
    campusName: 'Birla Institute of Technology and Science Pilani',
    approvalStatus: 'APPROVED',
    isEmailVerified: true,
  },
  {
    campusId: 'CAMP007',
    campusName: 'Delhi Technological University',
    approvalStatus: 'APPROVED',
    isEmailVerified: true,
  },
  {
    campusId: 'CAMP008',
    campusName: 'Netaji Subhas University of Technology',
    approvalStatus: 'APPROVED',
    isEmailVerified: true,
  },
  {
    campusId: 'CAMP009',
    campusName: 'Jawaharlal Nehru Technological University Hyderabad',
    approvalStatus: 'APPROVED',
    isEmailVerified: true,
  },
  {
    campusId: 'CAMP010',
    campusName: 'Vellore Institute of Technology',
    approvalStatus: 'APPROVED',
    isEmailVerified: true,
  },
] as const;


