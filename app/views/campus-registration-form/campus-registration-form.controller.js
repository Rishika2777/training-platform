/**
 * Campus Registration Form Controller
 */
angular.module('campusApp').controller('CampusRegistrationFormController', [
    '$scope',
    '$location',
    function ($scope, $location) {
        'use strict';

        $scope.campus = {};

        $scope.submitCampus = function () {
            // eslint-disable-next-line no-console
            console.log('Campus Submitted:', $scope.campus);
            // TODO: Replace with proper notification service when backend is ready
            // eslint-disable-next-line no-alert
            alert('Campus Registration Submitted Successfully!');
            $location.path('/admin/campus');
        };
    }
]);
