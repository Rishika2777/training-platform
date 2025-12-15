/**
 * Error Handler Service
 * Centralized error handling and user notifications
 */
angular.module('campusApp').service('ErrorHandlerService', [
    '$log',
    function ($log) {
        'use strict';

        /**
         * Handle API errors
         */
        this.handleApiError = function (error) {
            let message = 'An error occurred';
            const status = error.status || 500;

            if (error.data && error.data.message) {
                message = error.data.message;
            } else if (error.message) {
                message = error.message;
            }

            // Log error for debugging
            $log.error('API Error:', {
                status: status,
                message: message,
                error: error
            });

            // Return user-friendly message
            return {
                message: this.getUserFriendlyMessage(status, message),
                status: status,
                originalError: error
            };
        };

        /**
         * Get user-friendly error message
         */
        this.getUserFriendlyMessage = function (status, originalMessage) {
            switch (status) {
                case 400:
                    return originalMessage || 'Invalid request. Please check your input.';
                case 401:
                    return 'Authentication required. Please login again.';
                case 403:
                    return 'You do not have permission to perform this action.';
                case 404:
                    return 'The requested resource was not found.';
                case 409:
                    return 'A conflict occurred. The resource may already exist.';
                case 422:
                    return originalMessage || 'Validation error. Please check your input.';
                case 500:
                    return 'Server error. Please try again later.';
                case 503:
                    return 'Service unavailable. Please try again later.';
                default:
                    return originalMessage || 'An unexpected error occurred.';
            }
        };

        /**
         * Show error notification (to be integrated with toast service)
         */
        this.showError = function (message) {
            // TODO: Integrate with toast notification service
            // eslint-disable-next-line no-alert
            alert('Error: ' + message);
        };

        /**
         * Show success notification
         */
        this.showSuccess = function (message) {
            // TODO: Integrate with toast notification service
            // eslint-disable-next-line no-alert
            alert('Success: ' + message);
        };

        /**
         * Show warning notification
         */
        this.showWarning = function (message) {
            // TODO: Integrate with toast notification service
            // eslint-disable-next-line no-alert
            alert('Warning: ' + message);
        };

        /**
         * Show info notification
         */
        this.showInfo = function (message) {
            // TODO: Integrate with toast notification service
            // eslint-disable-next-line no-alert
            alert('Info: ' + message);
        };
    }
]);
