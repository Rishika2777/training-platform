/**
 * Campus Registration Controller
 * Handles campus registration form submission
 */
angular.module('campusApp.registration').controller('CampusRegistrationController', [
    '$scope',
    '$location',
    'CampusService',
    function ($scope, $location, CampusService) {
        $scope.campusData = null;
        $scope.loading = false;

        $scope.handleSubmit = function (campus) {
            $scope.loading = true;

            CampusService.create(campus)
                .then(function (response) {
                    // eslint-disable-next-line no-console
                    console.log('Campus registered successfully:', response);
                    $location.path('/dashboard/home');
                })
                .catch(function (error) {
                    // eslint-disable-next-line no-console
                    console.error('Error registering campus:', error);
                    $scope.loading = false;
                });
        };

        $scope.handleCancel = function () {
            $location.path('/register-options');
        };
    }
]);
