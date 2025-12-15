/**
 * Login Landing Page Controller
 * Landing page shown to non-authenticated users
 */
angular.module('campusApp').controller('LoginLandingPageController', [
    '$scope',
    '$location',
    'AuthService',
    'ROUTES',
    function ($scope, $location, AuthService, ROUTES) {
        'use strict';

        // Check if user is already logged in
        // If logged in, redirect to dashboard
        if (AuthService.isAuthenticated()) {
            $location.path(ROUTES.DASHBOARD_HOME);
            return;
        }

        $scope.goToLogin = function () {
            $location.path(ROUTES.LOGIN);
        };

        $scope.goToRegister = function () {
            $location.path(ROUTES.REGISTER);
        };

        $scope.goToRegisterOptions = function () {
            $location.path('/register-options');
        };
    }
]);
