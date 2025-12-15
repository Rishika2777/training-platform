/**
 * Routes Configuration
 * Centralized route configuration for modular architecture
 */
angular.module('campusApp').config([
    '$routeProvider',
    '$locationProvider',
    function ($routeProvider, $locationProvider) {
        'use strict';

        $locationProvider.hashPrefix('');

        // Root route - Login Landing Page (checks if user is already logged in)
        $routeProvider.when('/', {
            templateUrl: 'app/components/login-landing-page/login-landing-page.html',
            controller: 'LoginLandingPageController',
            requiresAuth: false
        });

        // Auth Routes
        $routeProvider
            .when('/login', {
                templateUrl: 'app/components/login/login.html',
                controller: 'LoginController',
                requiresAuth: false
            })
            .when('/register', {
                templateUrl: 'app/components/register/register.html',
                controller: 'RegisterController',
                requiresAuth: false
            })
            .when('/register-options', {
                templateUrl: 'app/components/register-options/register-options.html',
                controller: 'RegisterOptionsController',
                requiresAuth: false
            })
            .when('/register-campus', {
                templateUrl:
                    'app/features/registration/views/campus-registration/campus-registration.html',
                controller: 'CampusRegistrationController',
                requiresAuth: false
            })
            .when('/register-student', {
                templateUrl:
                    'app/features/registration/views/student-registration/student-registration.html',
                controller: 'StudentRegistrationController',
                requiresAuth: false
            })
            .when('/register-company', {
                templateUrl:
                    'app/features/registration/views/company-registration/company-registration.html',
                controller: 'CompanyRegistrationController',
                requiresAuth: false
            });

        // Campus User Routes - Must be before dashboard routes to avoid conflicts
        $routeProvider
            .when('/campus/home', {
                templateUrl: 'app/layout/layout.html',
                controller: 'DashboardLayoutController',
                requiresAuth: true,
                requiredRoles: ['CAMPUS_USER']
            })
            .when('/campus/about', {
                templateUrl: 'app/layout/layout.html',
                controller: 'DashboardLayoutController',
                requiresAuth: true,
                requiredRoles: ['CAMPUS_USER']
            })
            .when('/campus/courses', {
                templateUrl: 'app/layout/layout.html',
                controller: 'DashboardLayoutController',
                requiresAuth: true,
                requiredRoles: ['CAMPUS_USER']
            })
            .when('/campus/upload-prospectus', {
                templateUrl: 'app/layout/layout.html',
                controller: 'DashboardLayoutController',
                requiresAuth: true,
                requiredRoles: ['CAMPUS_USER']
            });

        // Dashboard Routes - Accessible to all authenticated users
        $routeProvider
            .when('/dashboard', {
                templateUrl: 'app/layout/layout.html',
                controller: 'DashboardLayoutController',
                requiresAuth: true,
                requiredRoles: [] // All authenticated users
            })
            .when('/dashboard/home', {
                templateUrl: 'app/components/dashboard/dashboard.html',
                controller: 'DashboardController',
                requiresAuth: true,
                requiredRoles: [] // All authenticated users
            });

        // Campus Routes - Admin and Campus Admin only
        // Note: /admin-campus route is deprecated, use /admin/campus instead
        $routeProvider
            .when('/campus-registration-form', {
                templateUrl: 'app/views/campus-registration-form/campus-registration-form.html',
                controller: 'CampusRegistrationFormController',
                requiresAuth: true,
                requiredRoles: ['ADMIN', 'SUPER_ADMIN', 'CAMPUS_ADMIN']
            })
            .when('/view-campus-profile/:id', {
                templateUrl: 'app/views/view-campus-profile/view-campus-profile.html',
                controller: 'ViewCampusProfileController',
                requiresAuth: true,
                requiredRoles: ['ADMIN', 'SUPER_ADMIN', 'CAMPUS_ADMIN']
            });

        // Courses Routes - Admin, Campus Admin, and Company
        $routeProvider
            .when('/course-offer-form', {
                templateUrl: 'app/views/courseOffer/course-offer-form.html',
                controller: 'CourseOfferFormController',
                requiresAuth: true,
                requiredRoles: ['ADMIN', 'SUPER_ADMIN', 'CAMPUS_ADMIN', 'COMPANY']
            })
            .when('/courses', {
                templateUrl: 'app/views/courseOffer/course-offer-form.html', // Using existing course form for now
                controller: 'CourseOfferFormController',
                requiresAuth: true,
                requiredRoles: [] // All authenticated users can view courses
            });

        // Admin Routes - Admin and Super Admin only
        // These routes use layout.html with nested views
        $routeProvider
            .when('/admin/dashboard', {
                templateUrl: 'app/layout/layout.html',
                controller: 'AdminLayoutController',
                requiresAuth: true,
                requiredRoles: ['ADMIN', 'SUPER_ADMIN']
            })
            .when('/admin/campus', {
                templateUrl: 'app/layout/layout.html',
                controller: 'AdminLayoutController',
                requiresAuth: true,
                requiredRoles: ['ADMIN', 'SUPER_ADMIN']
            })
            .when('/admin/student', {
                templateUrl: 'app/layout/layout.html',
                controller: 'AdminLayoutController',
                requiresAuth: true,
                requiredRoles: ['ADMIN', 'SUPER_ADMIN']
            })
            .when('/admin/company', {
                templateUrl: 'app/layout/layout.html',
                controller: 'AdminLayoutController',
                requiresAuth: true,
                requiredRoles: ['ADMIN', 'SUPER_ADMIN']
            })
            .when('/admin/app', {
                templateUrl: 'app/layout/layout.html',
                controller: 'AdminLayoutController',
                requiresAuth: true,
                requiredRoles: ['ADMIN', 'SUPER_ADMIN']
            });

        // Student Routes
        $routeProvider
            .when('/student/home', {
                templateUrl: 'app/layout/layout.html',
                controller: 'DashboardLayoutController',
                requiresAuth: true,
                requiredRoles: ['STUDENT']
            })
            .when('/student/profile', {
                templateUrl: 'app/layout/layout.html',
                controller: 'DashboardLayoutController',
                requiresAuth: true,
                requiredRoles: ['STUDENT']
            });
        // Note: learning-pathway is now a modal (certifications) opened from home page
        // Note: resume, dream-job-toolkit, and career-checkin are now modals opened from home page

        // Settings Routes - Accessible to all authenticated users
        $routeProvider.when('/settings/:section?', {
            templateUrl: 'app/layout/layout.html',
            controller: 'DashboardLayoutController',
            requiresAuth: true,
            requiredRoles: [] // All authenticated users
        });

        // Company Routes
        $routeProvider
            .when('/company/home', {
                templateUrl: 'app/layout/layout.html',
                controller: 'DashboardLayoutController',
                requiresAuth: true,
                requiredRoles: ['COMPANY']
            })
            .when('/company/about', {
                templateUrl: 'app/layout/layout.html',
                controller: 'DashboardLayoutController',
                requiresAuth: true,
                requiredRoles: ['COMPANY']
            })
            .when('/company/specialization', {
                templateUrl: 'app/layout/layout.html',
                controller: 'DashboardLayoutController',
                requiresAuth: true,
                requiredRoles: ['COMPANY']
            })
            .when('/company/vision-performance', {
                templateUrl: 'app/layout/layout.html',
                controller: 'DashboardLayoutController',
                requiresAuth: true,
                requiredRoles: ['COMPANY']
            })
            .when('/company/current-vacancy', {
                templateUrl: 'app/layout/layout.html',
                controller: 'DashboardLayoutController',
                requiresAuth: true,
                requiredRoles: ['COMPANY']
            })
            .when('/company/benefits', {
                templateUrl: 'app/layout/layout.html',
                controller: 'DashboardLayoutController',
                requiresAuth: true,
                requiredRoles: ['COMPANY']
            });

        // Default route - redirect to root (landing page)
        $routeProvider.otherwise({
            redirectTo: '/'
        });
    }
]);
