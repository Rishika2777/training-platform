/**
 * API Service
 * Centralized service for all HTTP requests with Swagger API integration
 */
angular.module('campusApp').service('ApiService', [
    '$http',
    '$q',
    'APP_CONFIG',
    'StorageService',
    function ($http, $q, APP_CONFIG, StorageService) {
        'use strict';

        /**
         * Get base URL for API requests
         */
        function getBaseUrl() {
            return APP_CONFIG.API_BASE_URL;
        }

        /**
         * Get default headers with authentication
         */
        function getHeaders(customHeaders) {
            const headers = {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            };

            // Add authentication token if available
            const token = StorageService.get('crm_auth_token');
            if (token) {
                headers['Authorization'] = 'Bearer ' + token;
            }

            // Merge custom headers
            if (customHeaders) {
                angular.extend(headers, customHeaders);
            }

            return headers;
        }

        /**
         * Replace URL parameters
         */
        function replaceUrlParams(url, params) {
            if (!params) {
                return url;
            }

            let result = url;
            angular.forEach(params, function (value, key) {
                result = result.replace(':' + key, value);
            });
            return result;
        }

        /**
         * Handle API response
         */
        function handleResponse(response) {
            return response.data;
        }

        /**
         * Handle API error
         */
        function handleError(error) {
            let errorMessage = 'An error occurred';

            if (error.data && error.data.message) {
                errorMessage = error.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }

            return $q.reject({
                message: errorMessage,
                status: error.status,
                data: error.data
            });
        }

        /**
         * Generic GET request
         */
        this.get = function (endpoint, params, urlParams) {
            const url = getBaseUrl() + replaceUrlParams(endpoint, urlParams);

            return $http({
                method: 'GET',
                url: url,
                params: params,
                headers: getHeaders()
            }).then(handleResponse, handleError);
        };

        /**
         * Generic POST request
         */
        this.post = function (endpoint, data, urlParams) {
            const url = getBaseUrl() + replaceUrlParams(endpoint, urlParams);

            return $http({
                method: 'POST',
                url: url,
                data: data,
                headers: getHeaders()
            }).then(handleResponse, handleError);
        };

        /**
         * Generic PUT request
         */
        this.put = function (endpoint, data, urlParams) {
            const url = getBaseUrl() + replaceUrlParams(endpoint, urlParams);

            return $http({
                method: 'PUT',
                url: url,
                data: data,
                headers: getHeaders()
            }).then(handleResponse, handleError);
        };

        /**
         * Generic PATCH request
         */
        this.patch = function (endpoint, data, urlParams) {
            const url = getBaseUrl() + replaceUrlParams(endpoint, urlParams);

            return $http({
                method: 'PATCH',
                url: url,
                data: data,
                headers: getHeaders()
            }).then(handleResponse, handleError);
        };

        /**
         * Generic DELETE request
         */
        this.delete = function (endpoint, urlParams) {
            const url = getBaseUrl() + replaceUrlParams(endpoint, urlParams);

            return $http({
                method: 'DELETE',
                url: url,
                headers: getHeaders()
            }).then(handleResponse, handleError);
        };

        /**
         * Upload file
         */
        this.upload = function (endpoint, file, urlParams, onProgress) {
            const url = getBaseUrl() + replaceUrlParams(endpoint, urlParams);
            const formData = new FormData();
            formData.append('file', file);

            const headers = getHeaders();
            delete headers['Content-Type']; // Let browser set it for FormData

            return $http({
                method: 'POST',
                url: url,
                data: formData,
                headers: headers,
                uploadEventHandlers: {
                    progress: function (e) {
                        if (onProgress && e.lengthComputable) {
                            const percentComplete = (e.loaded / e.total) * 100;
                            onProgress(percentComplete);
                        }
                    }
                }
            }).then(handleResponse, handleError);
        };
    }
]);
