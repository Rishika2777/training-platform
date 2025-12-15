/**
 * Admin Service
 * Service for admin-related operations
 */
angular.module('campusApp.admin').service('AdminService', [
    'ApiService',
    'ErrorHandlerService',
    'API_ENDPOINTS',
    function (ApiService, ErrorHandlerService, API_ENDPOINTS) {
        const self = this;

        // Get all campuses
        self.getCampuses = function (params) {
            return ApiService.get(API_ENDPOINTS.CAMPUS.LIST, params).catch(
                ErrorHandlerService.handleError
            );
        };

        // Get all students
        self.getStudents = function (params) {
            return ApiService.get(API_ENDPOINTS.STUDENTS.LIST, params).catch(
                ErrorHandlerService.handleError
            );
        };

        // Get all companies
        self.getCompanies = function (params) {
            return ApiService.get(API_ENDPOINTS.COMPANIES.LIST, params).catch(
                ErrorHandlerService.handleError
            );
        };

        // Get announcements
        self.getAnnouncements = function () {
            return ApiService.get(API_ENDPOINTS.ANNOUNCEMENTS.LIST).catch(
                ErrorHandlerService.handleError
            );
        };

        // Create announcement
        self.createAnnouncement = function (data) {
            return ApiService.post(API_ENDPOINTS.ANNOUNCEMENTS.CREATE, data).catch(
                ErrorHandlerService.handleError
            );
        };

        // Delete announcement
        self.deleteAnnouncement = function (id) {
            return ApiService.delete(API_ENDPOINTS.ANNOUNCEMENTS.DELETE + '/' + id).catch(
                ErrorHandlerService.handleError
            );
        };

        // Delete campus
        self.deleteCampus = function (id) {
            return ApiService.delete(API_ENDPOINTS.CAMPUS.DELETE + '/' + id).catch(
                ErrorHandlerService.handleError
            );
        };

        // Delete student
        self.deleteStudent = function (id) {
            return ApiService.delete(API_ENDPOINTS.STUDENTS.DELETE + '/' + id).catch(
                ErrorHandlerService.handleError
            );
        };

        // Delete company
        self.deleteCompany = function (id) {
            return ApiService.delete(API_ENDPOINTS.COMPANIES.DELETE + '/' + id).catch(
                ErrorHandlerService.handleError
            );
        };

        // Get dashboard statistics
        self.getDashboardStats = function () {
            return ApiService.get(API_ENDPOINTS.ADMIN.DASHBOARD_STATS).catch(
                ErrorHandlerService.handleError
            );
        };

        // Create student
        self.createStudent = function (studentData) {
            return ApiService.post(API_ENDPOINTS.STUDENTS.CREATE, studentData).catch(
                ErrorHandlerService.handleError
            );
        };

        // Create company
        self.createCompany = function (companyData) {
            return ApiService.post(API_ENDPOINTS.COMPANIES.CREATE, companyData).catch(
                ErrorHandlerService.handleError
            );
        };
    }
]);
