/**
 * Admin Layout Controller
 * Handles layout for admin routes
 */
angular.module('campusApp').controller('AdminLayoutController', [
    '$scope',
    '$location',
    '$controller',
    function ($scope, $location, $controller) {
        'use strict';

        const routeMap = {
            '/admin/dashboard': 'AdminDashboardController',
            '/admin/campus': 'CampusManagementController',
            '/admin/student': 'StudentManagementController',
            '/admin/company': 'CompanyManagementController',
            '/admin/app': 'AppManagementController'
        };

        const currentPath = $location.path();
        const controllerName = routeMap[currentPath];

        // Initialize the controller for the current route
        if (controllerName) {
            $controller(controllerName, {
                $scope: $scope
            });
        }

        // Set the template path for ng-include
        const templateMap = {
            '/admin/dashboard': 'app/features/admin/views/admin-dashboard/admin-dashboard.html',
            '/admin/campus': 'app/features/admin/views/campus-management/campus-management.html',
            '/admin/student': 'app/features/admin/views/student-management/student-management.html',
            '/admin/company': 'app/features/admin/views/company-management/company-management.html',
            '/admin/app': 'app/features/admin/views/app-management/app-management.html'
        };

        $scope.adminTemplate = templateMap[currentPath];
    }
]);
