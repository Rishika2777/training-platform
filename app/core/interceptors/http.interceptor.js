/**
 * HTTP Interceptor
 * Handles request/response interceptors for authentication, error handling
 */
angular.module('campusApp').config([
    '$httpProvider',
    function ($httpProvider) {
        'use strict';

        $httpProvider.interceptors.push([
            '$q',
            '$location',
            'StorageService',
            'ErrorHandlerService',
            'STORAGE_KEYS',
            function ($q, $location, StorageService, ErrorHandlerService, STORAGE_KEYS) {
                return {
                    /**
                     * Request interceptor - Add auth token to all requests
                     */
                    request: function (config) {
                        const token = StorageService.get(STORAGE_KEYS.AUTH_TOKEN);
                        if (token) {
                            config.headers = config.headers || {};
                            config.headers.Authorization = 'Bearer ' + token;
                        }
                        return config;
                    },

                    /**
                     * Response interceptor - Handle successful responses
                     */
                    response: function (response) {
                        return response;
                    },

                    /**
                     * Response error interceptor - Handle errors globally
                     */
                    responseError: function (rejection) {
                        const error = ErrorHandlerService.handleApiError(rejection);

                        // Handle 401 Unauthorized - redirect to login
                        if (rejection.status === 401) {
                            StorageService.remove(STORAGE_KEYS.AUTH_TOKEN);
                            StorageService.remove(STORAGE_KEYS.USER_DATA);
                            $location.path('/login');
                        }

                        // Handle 403 Forbidden
                        if (rejection.status === 403) {
                            ErrorHandlerService.showError(
                                'You do not have permission to access this resource.'
                            );
                        }

                        return $q.reject(error);
                    }
                };
            }
        ]);
    }
]);
