/**
 * Campus Service
 * Handles campus CRUD operations
 */
angular.module('campusApp.campus').service('CampusService', [
    'ApiService',
    'ErrorHandlerService',
    'API_ENDPOINTS',
    function (ApiService, ErrorHandlerService, API_ENDPOINTS) {
        'use strict';

        // ------------------ add

            // Register new campus (POST)
    this.registerCampus = function (campusData) {

        // Agar image bhi bhejni hai to FormData use karo
        var formData = new FormData();

        formData.append('name', campusData.name);
        formData.append('location', campusData.location);

        if (campusData.image) {
            formData.append('image', campusData.image);
        }

        return $http.post('/campus', formData, {
            headers: {
                'Content-Type': undefined // IMPORTANT for file upload
            },
            transformRequest: angular.identity
        });
    };

    // Get campus list
    this.getCampuses = function () {
        return $http.get('/campus');
    };

    // Delete campus
    this.deleteCampus = function (campusId) {
        return $http.delete('/campus/' + campusId);
    };
       
        this.getCurrentBatch = function () {
            return ApiService.get(API_ENDPOINTS.CAMPUS.CURRENT_BATCH);
        };

        // --------------- end 

        /**
         * Get all campuses
         */
        this.getAll = function (params) {
            return ApiService.get(API_ENDPOINTS.CAMPUS.LIST, params).catch(function (error) {
                return ErrorHandlerService.handleApiError(error);
            });
        };

        /**
      
         * Get campus by ID
         */
        this.getById = function (id) {
            return ApiService.get(API_ENDPOINTS.CAMPUS.DETAIL, null, { id: id }).catch(
                function (error) {
                    return ErrorHandlerService.handleApiError(error);
                }
            );
        };

        /**
         * Create new campus
         */
        this.create = function (campusData) {
            return ApiService.post(API_ENDPOINTS.CAMPUS.CREATE, campusData).catch(function (error) {
                return ErrorHandlerService.handleApiError(error);
            });
        };

        /**
         * Update campus
         */
        this.update = function (id, campusData) {
            return ApiService.put(API_ENDPOINTS.CAMPUS.UPDATE, campusData, { id: id }).catch(
                function (error) {
                    return ErrorHandlerService.handleApiError(error);
                }
            );
        };

        /**
         * Delete campus
         */
        this.delete = function (id) {
            return ApiService.delete(API_ENDPOINTS.CAMPUS.DELETE, { id: id }).catch(
                function (error) {
                    return ErrorHandlerService.handleApiError(error);
                }
            );
        };
    }
]);
