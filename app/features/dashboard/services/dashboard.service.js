/**
 * Dashboard Service
 * Handles dashboard data operations
 */
angular.module('campusApp.dashboard').service('DashboardService', [
    'ApiService',
    'ErrorHandlerService',
    'API_ENDPOINTS',
    function (ApiService, ErrorHandlerService, API_ENDPOINTS) {
        'use strict';

        /**
         * Get dashboard statistics
         */
        this.getStats = function () {
            return ApiService.get(API_ENDPOINTS.DASHBOARD.STATS).catch(function (error) {
                return ErrorHandlerService.handleApiError(error);
            });
        };

        /**
         * Get announcements
         */
        this.getAnnouncements = function () {
            return ApiService.get(API_ENDPOINTS.DASHBOARD.ANNOUNCEMENTS).catch(function (error) {
                return ErrorHandlerService.handleApiError(error);
            });
        };
    }
]);
