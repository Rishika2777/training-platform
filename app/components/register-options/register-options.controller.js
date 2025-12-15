/**
 * Register Options Controller
 */
angular.module('campusApp').controller('RegisterOptionsController', [
    '$scope',
    '$location',
    'ROUTES',
    function ($scope, $location, ROUTES) {
        'use strict';

        $scope.goLogin = function () {
            $location.path(ROUTES.LOGIN);
        };

        $scope.goCampus = function () {
            $location.path('/register-campus');
        };

        $scope.goStudent = function () {
            $location.path('/register-student');
        };

        $scope.goCompany = function () {
            $location.path('/register-company');
        };
    }
]);
