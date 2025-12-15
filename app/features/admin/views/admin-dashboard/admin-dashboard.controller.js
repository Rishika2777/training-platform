/**
 * Admin Dashboard Controller
 * Handles admin dashboard functionality
 */
angular.module('campusApp.admin').controller('AdminDashboardController', [
    '$scope',
    'AdminService',
    function ($scope, AdminService) {
        $scope.loading = false;
        $scope.stats = {
            totalCampuses: 0,
            totalStudents: 0,
            totalCompanies: 0
        };
        $scope.postContent = '';
        $scope.coursesCarousel = { currentPage: 1, totalPages: 6 };

        function getEmptyCourseForm() {
            return {
                name: '',
                category: '',
                duration: '',
                photo: null,
                description: ''
            };
        }

        $scope.showCourseFormModal = false;
        $scope.courseForm = getEmptyCourseForm();

        $scope.loadDashboardData = function () {
            $scope.loading = true;
            AdminService.getDashboardStats()
                .then(function (response) {
                    if (response && response.data) {
                        $scope.stats = response.data;
                    }
                    $scope.loading = false;
                })
                .catch(function (error) {
                    console.error('Error loading dashboard stats:', error);
                    $scope.loading = false;
                });
        };

        $scope.openAddAnnouncementModal = function () {
            // TODO: Open modal to add announcement
            // eslint-disable-next-line no-console
            console.log('Open add announcement modal');
        };

        $scope.removeAnnouncement = function () {
            // TODO: Remove announcement
            // eslint-disable-next-line no-console
            console.log('Remove announcement');
        };

        $scope.attachImage = function () {
            // TODO: attach image
            // eslint-disable-next-line no-console
            console.log('Attach image');
        };

        $scope.attachLocation = function () {
            // TODO: attach location
            // eslint-disable-next-line no-console
            console.log('Attach location');
        };

        $scope.submitPost = function () {
            if (!$scope.postContent) {
                return;
            }
            // TODO: submit post
            $scope.postContent = '';
        };

        $scope.onCoursesPageChange = function (page) {
            $scope.coursesCarousel.currentPage = page;
            // TODO: load courses page from API
        };

        $scope.openCourseForm = function () {
            $scope.courseForm = getEmptyCourseForm();
            $scope.showCourseFormModal = true;
        };

        $scope.closeCourseForm = function () {
            $scope.showCourseFormModal = false;
        };

        $scope.onCoursePhotoSelected = function (files) {
            $scope.courseForm.photo = files || null;
        };

        $scope.submitCourseForm = function () {
            // TODO: Integrate API call to create course
            // eslint-disable-next-line no-console
            console.log('Submit course form', $scope.courseForm);
            $scope.closeCourseForm();
        };

        $scope.loadDashboardData();
    }
]);