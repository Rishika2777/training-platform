/**
 * Login Controller
 * Handles user login functionality
 * Uses AuthService for authentication (dummy implementation until backend is ready)
 */
angular.module('campusApp').controller('LoginController', [
    '$scope',
    '$location',
    '$timeout',
    'AuthService',
    'ErrorHandlerService',
    'ROUTES',
    function ($scope, $location, $timeout, AuthService, ErrorHandlerService, ROUTES) {
        'use strict';

        $scope.login = {};
        $scope.isLoading = false;
        $scope.errorMessage = '';

        /**
         * Sign in user
         * Uses AuthService which has dummy implementation until backend API is ready
         */
        $scope.signIn = function () {
            if (!$scope.login.email || !$scope.login.password) {
                ErrorHandlerService.showError('Please enter email and password');
                return;
            }

            $scope.isLoading = true;
            $scope.errorMessage = '';

            // Use AuthService for login
            // TODO: When backend is ready, AuthService will automatically use real API
            // See app/features/auth/services/auth.service.js for implementation details
            AuthService.login({
                email: $scope.login.email,
                password: $scope.login.password
            })
                .then(function (response) {
                    $scope.isLoading = false;
                    if (response.success) {
                        // Login successful, redirect based on user role
                        const user = response.user || response.data;
                        const userRole = user && (user.role || (user.roles && user.roles[0]));

                        // Redirect immediately - storage is already set by AuthService
                        // Use $timeout to ensure Angular processes the location change
                        $timeout(function () {
                            // Redirect users based on their role
                            let redirectPath;
                            if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
                                redirectPath = '/admin/dashboard';
                            } else if (userRole === 'CAMPUS_USER') {
                                redirectPath = '/campus/home';
                            } else if (userRole === 'STUDENT') {
                                redirectPath = '/student/home';
                            } else if (userRole === 'COMPANY') {
                                redirectPath = '/company/home';
                            } else {
                                redirectPath = ROUTES.DASHBOARD_HOME;
                            }

                            $location.path(redirectPath);
                        }, 0);
                    } else {
                        $scope.errorMessage = response.message || 'Login failed';
                    }
                })
                .catch(function (error) {
                    $scope.isLoading = false;
                    $scope.errorMessage = error.message || 'An error occurred during login';
                    ErrorHandlerService.showError($scope.errorMessage);
                });
        };

        /**
         * Navigate to register page
         */
        $scope.goRegister = function () {
            $location.path(ROUTES.REGISTER);
        };

        /**
         * Handle forgot password
         * TODO: Implement forgot password functionality when backend is ready
         */
        $scope.forgotPassword = function () {
            // TODO: Implement forgot password flow
            // Use AuthService.forgotPassword(email) when backend is ready
            ErrorHandlerService.showInfo('Forgot password functionality will be available soon');
        };
    }
]);
