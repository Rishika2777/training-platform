/**
 * Dashboard Layout Controller
 * Handles layout for dashboard routes and role-based views
 */
angular.module('campusApp').controller('DashboardLayoutController', [
    '$scope',
    '$location',
    '$controller',
    'ROUTES',
    function ($scope, $location, $controller, ROUTES) {
        'use strict';

        // Redirect /dashboard to /dashboard/home
        if ($location.path() === '/dashboard') {
            $location.path(ROUTES.DASHBOARD_HOME);
        }

        // Route map for role-based views
        const routeMap = {
            // Campus User routes
            '/campus/home': 'CampusHomeController',
            '/campus/about': 'CampusAboutController',
            '/campus/courses': 'CampusCoursesController',
            '/campus/upload-prospectus': 'CampusProspectusController',

            // Student routes
            '/student/home': 'StudentHomeController',
            '/student/profile': 'StudentProfileController',
            // Note: learning-pathway, resume, dream-job-toolkit, and career-checkin are now modals opened from home page

            // Company routes
            '/company/home': 'CompanyHomeController',
            '/company/about': 'CompanyAboutController',

            // Settings routes (handled via /settings/:section?)
            '/settings': 'SettingsController'
            // Note: specialization, vision-performance, current-vacancy, and benefits are now modals opened from home page
        };

        // Template map for role-based views
        const templateMap = {
            // Campus User templates
            '/campus/home': 'app/features/campus/views/campus-home/campus-home.html',
            '/campus/about': 'app/features/campus/views/campus-about/campus-about.html',
            '/campus/courses': 'app/features/campus/views/campus-courses/campus-courses.html',
            '/campus/upload-prospectus':
                'app/features/campus/views/campus-prospectus/campus-prospectus.html',

            // Student templates
            '/student/home': 'app/features/student/views/student-home/student-home.html',
            '/student/profile': 'app/features/student/views/student-profile/student-profile.html',
            // Note: learning-pathway, resume, dream-job-toolkit, and career-checkin are now modals opened from home page

            // Company templates
            '/company/home': 'app/features/company/views/company-home/company-home.html',
            '/company/about': 'app/features/company/views/company-about/company-about.html',

            // Settings template
            '/settings': 'app/features/settings/settings.html'
            // Note: specialization, vision-performance, current-vacancy, and benefits are now modals opened from home page
        };

        function getRouteKey(path) {
            if (path && path.startsWith('/settings')) {
                return '/settings';
            }
            return path;
        }

        const currentPath = $location.path();
        const routeKey = getRouteKey(currentPath);
        const controllerName = routeMap[routeKey];
        const templatePath = templateMap[routeKey];

        // Initialize the controller for the current route
        if (controllerName) {
            $controller(controllerName, {
                $scope: $scope
            });
        }

        // Set the template path for ng-include
        // Clear both templates first to avoid conflicts
        $scope.adminTemplate = null;
        $scope.roleTemplate = null;

        // Set role template if we have a matching path
        if (templatePath) {
            $scope.roleTemplate = templatePath;
        }
    }
]);
