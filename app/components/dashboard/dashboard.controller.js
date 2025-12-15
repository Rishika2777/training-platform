/**
 * Dashboard Controller
 */
angular.module('campusApp').controller('dashboardController', [
    '$scope',
    '$location',
    function ($scope, $location) {
        'use strict';

        $scope.title = 'Dashboard Home';

        $scope.openCourseForm = function () {
            $location.path('/course-offer-form'); // navigate to Add Course form
        };
    }
]);
