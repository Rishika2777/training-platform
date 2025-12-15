/**
 * Application Constants
 * Centralized configuration for the CRM application
 */
angular
    .module('campusApp')
    .constant('APP_CONFIG', {
        APP_NAME: 'Synkup CRM',
        VERSION: '1.0.0',
        API_BASE_URL: 'http://localhost:3000/api', // Will be replaced with actual API URL
        SWAGGER_DOCS_URL: 'http://localhost:3000/api-docs',
        DEFAULT_PAGE_SIZE: 10,
        MAX_PAGE_SIZE: 100,
        // Development mode: Set to true to clear authentication cache on every app start
        // Set to false in production to persist login sessions
        CLEAR_CACHE_ON_START: true // Change to false in production
    })
    .constant('API_ENDPOINTS', {
        AUTH: {
            LOGIN: '/auth/login',
            LOGOUT: '/auth/logout',
            REGISTER: '/auth/register',
            REFRESH_TOKEN: '/auth/refresh-token',
            FORGOT_PASSWORD: '/auth/forgot-password',
            RESET_PASSWORD: '/auth/reset-password'
        },
        USERS: {
            BASE: '/users',
            PROFILE: '/users/profile',
            UPDATE: '/users/:id'
        },
        CAMPUS: {
            BASE: '/campus',
            LIST: '/campus',
            DETAIL: '/campus/:id',
            CREATE: '/campus',
            UPDATE: '/campus/:id',
            DELETE: '/campus/:id',
            COURSES: '/campus/courses',
            COURSES_UPDATE: '/campus/courses/:id',
            PROSPECTUS: '/campus/prospectus',

            // ----------------- UPLOAD PROSPECTUS ADD

            PROSPECTUS_UPLOAD: '/api/campus/prospectus',              // POST
            PROSPECTUS_LIST: '/api/campus/prospectus',                // GET
            PROSPECTUS_DOWNLOAD: '/api/campus/prospectus/:id/download', // GET
            PROSPECTUS_DELETE: '/api/campus/prospectus/:id',
            // ----------------------- END 

            // -------------- DASHBOARD APIS ADD 
            CURRENT_BATCH: '/campus/current-batch',
            POSTS: '/campus/posts',
            PLACED_STUDENTS: '/campus/placed-students',
            COMPANIES_VISITED: '/campus/companies-visited',
            DAILY_NOTICE: '/campus/daily-notice',
            ALUMNI: '/campus/alumni'
            // -------------- DASHBOARD APIS END 
            
        },
        COURSES: {
            BASE: '/courses',
            LIST: '/courses',
            DETAIL: '/courses/:id',
            CREATE: '/courses',
            UPDATE: '/courses/:id',
            DELETE: '/courses/:id',

            // -------------- COURSES SECTION 
            COURSES: '/campus/courses',
            COURSE_BY_ID: '/campus/courses/:courseId',
            COURSE_UPDATE: '/campus/courses/:courseId',
            COURSE_DELETE: '/campus/courses/:courseId'

        },
        DASHBOARD: {
            STATS: '/dashboard/stats',
            ANNOUNCEMENTS: '/dashboard/announcements'
        },
        STUDENTS: {
            BASE: '/students',
            LIST: '/students',
            DETAIL: '/students/:id',
            CREATE: '/students',
            UPDATE: '/students/:id',
            DELETE: '/students/:id'
        },
        COMPANIES: {
            BASE: '/companies',
            LIST: '/companies',
            DETAIL: '/companies/:id',
            CREATE: '/companies',
            UPDATE: '/companies/:id',
            DELETE: '/companies/:id'
        },
        COMPANY: {
            SPECIALIZATIONS: '/companies/specializations',
            VISION_ACHIEVEMENTS: '/companies/vision-achievements',
            BENEFITS: '/companies/benefits',
            VACANCIES: '/companies/vacancies',
            VACANCY_DETAIL: '/companies/vacancies/:id'
        },
        ANNOUNCEMENTS: {
            BASE: '/announcements',
            LIST: '/announcements',
            DETAIL: '/announcements/:id',
            CREATE: '/announcements',
            UPDATE: '/announcements/:id',
            DELETE: '/announcements/:id'
        },
        ADMIN: {
            DASHBOARD_STATS: '/admin/dashboard/stats',
            ANALYTICS: '/admin/analytics'
        },
        NOTIFICATIONS: {
            LIST: '/notifications',
            MARK_ALL_READ: '/notifications/read-all'
        }
    })
    .constant('ROUTES', {
        ROOT: '/',
        LOGIN: '/login',
        REGISTER: '/register',
        DASHBOARD: '/dashboard',
        DASHBOARD_HOME: '/dashboard/home'
    })
    .constant('THEME', {
        COLORS: {
            PRIMARY: '#557F87',
            PRIMARY_DARK: '#46696F',
            SECONDARY: '#F29D52',
            SECONDARY_LIGHT: '#ff9b50',
            BACKGROUND: '#5f7f83',
            FOOTER: '#f2a65a',
            WHITE: '#ffffff',
            TEXT_PRIMARY: '#333333',
            TEXT_SECONDARY: '#666666',
            BORDER: '#e0e0e0',
            SUCCESS: '#4caf50',
            ERROR: '#f44336',
            WARNING: '#ff9800',
            INFO: '#2196f3'
        },
        SPACING: {
            XS: '5px',
            SM: '10px',
            MD: '15px',
            LG: '20px',
            XL: '30px',
            XXL: '40px'
        },
        BORDER_RADIUS: {
            SM: '8px',
            MD: '12px',
            LG: '20px',
            XL: '25px'
        },
        FONT_SIZES: {
            XS: '12px',
            SM: '14px',
            MD: '16px',
            LG: '20px',
            XL: '24px',
            XXL: '28px'
        }
    })
    .constant('STORAGE_KEYS', {
        AUTH_TOKEN: 'crm_auth_token',
        REFRESH_TOKEN: 'crm_refresh_token',
        USER_DATA: 'crm_user_data',
        MENU_CONFIG: 'crm_menu_config'
    })
    .constant('USER_ROLES', {
        SUPER_ADMIN: 'SUPER_ADMIN',
        ADMIN: 'ADMIN',
        CAMPUS_ADMIN: 'CAMPUS_ADMIN',
        STUDENT: 'STUDENT',
        COMPANY: 'COMPANY',
        USER: 'USER'
    })
    .constant('ROLE_HIERARCHY', {
        // Higher number = more permissions
        SUPER_ADMIN: 100,
        ADMIN: 80,
        CAMPUS_ADMIN: 60,
        COMPANY: 40,
        STUDENT: 20,
        USER: 10
    });
