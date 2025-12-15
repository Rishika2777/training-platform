/**
 * Courses Service
 * Handles course CRUD operations
 */
angular.module('campusApp.courses').service('CoursesService', [
    'ApiService',
    'ErrorHandlerService',
    'API_ENDPOINTS',
    function (ApiService, ErrorHandlerService, API_ENDPOINTS) {
        'use strict';

        /**
         * Get all courses
         */
        this.getAll = function (params) {
            return ApiService.get(API_ENDPOINTS.COURSES.LIST, params).catch(function (error) {
                return ErrorHandlerService.handleApiError(error);
            });
        };

        /**
         * Get course by ID
         */
        this.getById = function (id) {
            return ApiService.get(API_ENDPOINTS.COURSES.DETAIL, null, { id: id }).catch(
                function (error) {
                    return ErrorHandlerService.handleApiError(error);
                }
            );
        };

        /**
         * Create new course
         */
        this.create = function (courseData) {
            return ApiService.post(API_ENDPOINTS.COURSES.CREATE, courseData).catch(
                function (error) {
                    return ErrorHandlerService.handleApiError(error);
                }
            );
        };

        /**
         * Update course
         */
        this.update = function (id, courseData) {
            return ApiService.put(API_ENDPOINTS.COURSES.UPDATE, courseData, { id: id }).catch(
                function (error) {
                    return ErrorHandlerService.handleApiError(error);
                }
            );
        };

        /**
         * Delete course
         */
        this.delete = function (id) {
            return ApiService.delete(API_ENDPOINTS.COURSES.DELETE, { id: id }).catch(
                function (error) {
                    return ErrorHandlerService.handleApiError(error);
                }
            );
        };
    }
]);
