/**
 * Company Registration Controller
 * Handles company registration form submission
 */
angular.module('campusApp.registration').controller('CompanyRegistrationController', [
    '$scope',
    '$location',
    'AdminService',
    function ($scope, $location, AdminService) {
        $scope.companyData = null;
        $scope.loading = false;

        $scope.handleSubmit = function (company) {
            $scope.loading = true;

            AdminService.createCompany(company)
                .then(function (response) {
                    // eslint-disable-next-line no-console
                    console.log('Company registered successfully:', response);
                    $location.path('/dashboard/home');
                })
                .catch(function (error) {
                    // eslint-disable-next-line no-console
                    console.error('Error registering company:', error);
                    $scope.loading = false;
                });
        };

        $scope.handleCancel = function () {
            $location.path('/register-options');
        };
    }
]);
