/**
 * Student Registration Controller
 * Handles student registration form submission
 */
angular.module('campusApp.registration').controller('StudentRegistrationController', [
    '$scope',
    '$location',
    'AdminService',
    function ($scope, $location, AdminService) {
        $scope.studentData = null;
        $scope.loading = false;

        $scope.handleSubmit = function (student) {
            $scope.loading = true;

            AdminService.createStudent(student)
                .then(function (response) {
                    // eslint-disable-next-line no-console
                    console.log('Student registered successfully:', response);
                    $location.path('/dashboard/home');
                })
                .catch(function (error) {
                    // eslint-disable-next-line no-console
                    console.error('Error registering student:', error);
                    $scope.loading = false;
                });
        };

        $scope.handleCancel = function () {
            $location.path('/register-options');
        };
    }
]);
