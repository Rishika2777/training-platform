/**
 * Company Management Controller
 * Handles company listing, viewing, and deletion
 */
angular.module('campusApp.admin').controller('CompanyManagementController', [
    '$scope',
    'AdminService',
    'MOCK_ADMIN_DATA',
    function ($scope, AdminService, MOCK_ADMIN_DATA) {
        $scope.companies = [];
        $scope.currentPage = 1;
        $scope.totalPages = 1;
        $scope.pageSize = 9;
        $scope.loading = false;

        $scope.loadCompanies = function (page) {
            $scope.loading = true;
            const params = {
                page: page || $scope.currentPage,
                limit: $scope.pageSize
            };

            AdminService.getCompanies(params)
                .then(function (response) {
                    $scope.companies = response.data || response || [];
                    $scope.totalPages =
                        response.totalPages ||
                        Math.ceil($scope.companies.length / $scope.pageSize) ||
                        1;
                    $scope.loading = false;
                })
                .catch(function (error) {
                    console.error('Error loading companies:', error);
                    // Use mock data when API fails
                    const mockResponse = MOCK_ADMIN_DATA.getCompanies(params);
                    $scope.companies = mockResponse.data || [];
                    $scope.totalPages = mockResponse.totalPages || 1;
                    $scope.loading = false;
                });
        };

        $scope.viewCompany = function (company) {
            // Navigate to company detail view
            // eslint-disable-next-line no-console
            console.log('View company:', company);
        };

        $scope.deleteCompany = function (company) {
            if (
                // eslint-disable-next-line no-alert
                confirm('Are you sure you want to delete ' + (company.name || 'this company') + '?')
            ) {
                AdminService.deleteCompany(company.id)
                    .then(function () {
                        $scope.loadCompanies();
                    })
                    .catch(function (error) {
                        // eslint-disable-next-line no-console
                        console.error('Error deleting company:', error);
                        // eslint-disable-next-line no-alert
                        alert('Failed to delete company');
                    });
            }
        };

        $scope.onPageChange = function (page) {
            $scope.currentPage = page;
            $scope.loadCompanies(page);
        };

        $scope.openAddCompanyModal = function () {
            // TODO: Open modal to add new company
            // eslint-disable-next-line no-console
            console.log('Open add company modal');
        };

        $scope.loadCompanies();
    }
]);
