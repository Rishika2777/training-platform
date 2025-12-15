/**
 * Auth Service
 * Handles authentication operations
 */
angular.module('campusApp.auth').service('AuthService', [
    '$q',
    'ApiService',
    'StorageService',
    'ErrorHandlerService',
    'API_ENDPOINTS',
    'STORAGE_KEYS',
    'MOCK_USERS',
    function (
        $q,
        ApiService,
        StorageService,
        ErrorHandlerService,
        API_ENDPOINTS,
        STORAGE_KEYS,
        MOCK_USERS
    ) {
        'use strict';

        /**
         * Login user
         *
         * Uses mock JSON data for development
         * TODO: REPLACE WITH REAL API CALL WHEN BACKEND IS READY
         */
        this.login = function (credentials) {
            // ============================================
            // MOCK API IMPLEMENTATION - FOR DEVELOPMENT ONLY
            // ============================================
            const deferred = $q.defer();

            // Validate input
            if (!credentials.email || !credentials.password) {
                deferred.reject({
                    success: false,
                    message: 'Email and password are required',
                    status: 400
                });
                return deferred.promise;
            }

            // Simulate API delay
            setTimeout(function () {
                // Find user in mock data
                const user = MOCK_USERS.findByCredentials(credentials.email, credentials.password);

                if (user) {
                    // Create user response object (without password)
                    const userResponse = {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                        roles: user.roles,
                        permissions: user.permissions,
                        profile: user.profile
                    };

                    // Generate mock token
                    const token = 'mock_token_' + user.id + '_' + Date.now();
                    const refreshToken = 'mock_refresh_' + user.id + '_' + Date.now();

                    // Store in localStorage
                    StorageService.set(STORAGE_KEYS.AUTH_TOKEN, token);
                    StorageService.set(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
                    StorageService.set(STORAGE_KEYS.USER_DATA, userResponse);

                    // Return success response
                    deferred.resolve({
                        success: true,
                        message: 'Login successful',
                        token: token,
                        refreshToken: refreshToken,
                        user: userResponse
                    });
                } else {
                    // Invalid credentials
                    deferred.reject({
                        success: false,
                        message: 'Invalid email or password',
                        status: 401
                    });
                }
            }, 500); // Simulate 500ms API delay

            return deferred.promise;

            // ============================================
            // REAL API IMPLEMENTATION - UNCOMMENT WHEN BACKEND IS READY
            // ============================================
            /*
            return ApiService.post(API_ENDPOINTS.AUTH.LOGIN, credentials)
                .then(function(response) {
                    if (response.token) {
                        StorageService.set(STORAGE_KEYS.AUTH_TOKEN, response.token);
                        StorageService.set(STORAGE_KEYS.USER_DATA, response.user);
                    }
                    return response;
                })
                .catch(function(error) {
                    return ErrorHandlerService.handleApiError(error);
                });
            */
        };

        /**
         * Register user
         *
         * TODO: REPLACE WITH REAL API CALL WHEN BACKEND IS READY
         * Remove the dummy implementation below and uncomment the real API call
         */
        this.register = function (userData) {
            // ============================================
            // DUMMY IMPLEMENTATION - FOR DEVELOPMENT ONLY
            // ============================================
            const deferred = $q.defer();

            setTimeout(function () {
                if (userData.email && userData.password) {
                    deferred.resolve({
                        success: true,
                        message: 'Registration successful (Dummy)',
                        user: {
                            id: Date.now(),
                            email: userData.email,
                            name: userData.name || userData.email.split('@')[0]
                        }
                    });
                } else {
                    deferred.reject({
                        message: 'Email and password are required',
                        status: 400
                    });
                }
            }, 500);

            return deferred.promise;

            // ============================================
            // REAL API IMPLEMENTATION - UNCOMMENT WHEN BACKEND IS READY
            // ============================================
            /*
            return ApiService.post(API_ENDPOINTS.AUTH.REGISTER, userData)
                .then(function(response) {
                    return response;
                })
                .catch(function(error) {
                    return ErrorHandlerService.handleApiError(error);
                });
            */
        };

        /**
         * Logout user
         *
         * TODO: REPLACE WITH REAL API CALL WHEN BACKEND IS READY
         * Currently just clears local storage
         */
        this.logout = function () {
            // ============================================
            // DUMMY IMPLEMENTATION - FOR DEVELOPMENT ONLY
            // ============================================
            // Clear local storage immediately
            StorageService.remove(STORAGE_KEYS.AUTH_TOKEN);
            StorageService.remove(STORAGE_KEYS.REFRESH_TOKEN);
            StorageService.remove(STORAGE_KEYS.USER_DATA);

            return $q.resolve({
                success: true,
                message: 'Logout successful (Dummy)'
            });

            // ============================================
            // REAL API IMPLEMENTATION - UNCOMMENT WHEN BACKEND IS READY
            // ============================================
            /*
            return ApiService.post(API_ENDPOINTS.AUTH.LOGOUT)
                .finally(function() {
                    StorageService.remove(STORAGE_KEYS.AUTH_TOKEN);
                    StorageService.remove(STORAGE_KEYS.REFRESH_TOKEN);
                    StorageService.remove(STORAGE_KEYS.USER_DATA);
                });
            */
        };

        /**
         * Check if user is authenticated
         */
        this.isAuthenticated = function () {
            const token = StorageService.get(STORAGE_KEYS.AUTH_TOKEN);
            return !!token;
        };

        /**
         * Get current user
         */
        this.getCurrentUser = function () {
            return StorageService.get(STORAGE_KEYS.USER_DATA);
        };

        /**
         * Forgot password
         */
        this.forgotPassword = function (email) {
            return ApiService.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email: email }).catch(
                function (error) {
                    return ErrorHandlerService.handleApiError(error);
                }
            );
        };

        /**
         * Reset password
         */
        this.resetPassword = function (token, newPassword) {
            return ApiService.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
                token: token,
                password: newPassword
            }).catch(function (error) {
                return ErrorHandlerService.handleApiError(error);
            });
        };
    }
]);
