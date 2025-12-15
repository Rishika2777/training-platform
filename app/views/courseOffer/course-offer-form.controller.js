/**
 * Course Offer Form Controller
 */
angular.module('campusApp').controller('CourseOfferFormController', [
    '$scope',
    '$location',
    function ($scope, $location) {
        'use strict';

        $scope.course = {};

        $scope.closeForm = function () {
            $location.path('/dashboard/home');
        };

        $scope.submitCourse = function () {
            // eslint-disable-next-line no-console
            console.log('Course Data:', $scope.course);
            // TODO: Replace with proper notification service when backend is ready
            // eslint-disable-next-line no-alert
            alert('Course submitted successfully!');
            $location.path('/dashboard/home');
        };
    }
]);
