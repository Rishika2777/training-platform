/**
 * Register Controller
 */
angular.module('campusApp').controller('RegisterController', [
    '$scope',
    '$location',
    'ROUTES',
    function ($scope, $location, ROUTES) {
        'use strict';

        $scope.createAccount = function () {
            $location.path('/register-options');
        };

        $scope.goLogin = function () {
            $location.path(ROUTES.LOGIN);
        };
    }
]);
