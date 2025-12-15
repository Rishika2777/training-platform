/**
 * Campus Management Controller
 * Handles campus listing, viewing, and deletion
 */
angular.module('campusApp.admin').controller('CampusManagementController', [
    '$scope',
    'AdminService',
    'MOCK_ADMIN_DATA',
    function ($scope, AdminService, MOCK_ADMIN_DATA) {
        $scope.campuses = [];
        $scope.currentPage = 1;
        $scope.totalPages = 1;
        $scope.pageSize = 9;
        $scope.loading = false;

        $scope.loadCampuses = function (page) {
            $scope.loading = true;
            const params = {
                page: page || $scope.currentPage,
                limit: $scope.pageSize
            };

            AdminService.getCampuses(params)
                .then(function (response) {
                    $scope.campuses = response.data || response || [];
                    $scope.totalPages =
                        response.totalPages ||
                        Math.ceil($scope.campuses.length / $scope.pageSize) ||
                        1;
                    $scope.loading = false;
                })
                .catch(function (error) {
                    console.error('Error loading campuses:', error);
                    // Use mock data when API fails
                    const mockResponse = MOCK_ADMIN_DATA.getCampuses(params);
                    $scope.campuses = mockResponse.data || [];
                    $scope.totalPages = mockResponse.totalPages || 1;
                    $scope.loading = false;
                });
        };

        $scope.viewCampus = function (campus) {
            // Navigate to campus detail view
            window.location.hash = '/view-campus-profile/' + campus.id;
        };

        $scope.deleteCampus = function (campus) {
            // eslint-disable-next-line no-alert
            if (confirm('Are you sure you want to delete ' + campus.name + '?')) {
                AdminService.deleteCampus(campus.id)
                    .then(function () {
                        $scope.loadCampuses();
                    })
                    .catch(function (error) {
                        // eslint-disable-next-line no-console
                        console.error('Error deleting campus:', error);
                        // eslint-disable-next-line no-alert
                        alert('Failed to delete campus');
                    });
            }
        };

        $scope.onPageChange = function (page) {
            $scope.currentPage = page;
            $scope.loadCampuses(page);
        };

        $scope.openAddCampusModal = function () {
            // TODO: Open modal to add new campus
            // eslint-disable-next-line no-console
            $scope.campusForm = {};
            $scope.showAddCampusModal = true;
            console.log('Open add campus modal');
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

        // ------------------------- ADD SUBMIT CAMPUS FORM 

            // Modal close
    $scope.closeAddCampusModal = function () {
        $scope.showAddCampusModal = false;
    };


        // Submit campus form ✅
        $scope.submitCampus = function () {
            $scope.loading = true;

            CampusService.registerCampus($scope.campusForm)
                .then(function (res) {
                    $scope.showAddCampusModal = false;
                    $scope.getCampuses(); // refresh list
                })
                .catch(function (err) {
                    console.error('Campus registration failed', err);
                })
                .finally(function () {
                    $scope.loading = false;
                });
        };

        // Fetch campus list
        $scope.getCampuses = function () {
            CampusService.getCampuses().then(function (res) {
                $scope.campuses = res.data;
            });
        };

        // Initial load
        $scope.getCampuses();

        // ----------------------- END 
        $scope.loadCampuses();
    }
]);
