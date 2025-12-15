/**
 * Sidebar Controller
 * Note: This controller is not currently used as the sidebar uses a directive with inline controller
 * Keeping for backward compatibility
 */
angular.module('campusApp').controller('sidebarController', [
    '$scope',
    '$location',
    function ($scope, $location) {
        'use strict';

        $scope.isActive = function (path) {
            return $location.path().startsWith(path);
        };
    }
]);
