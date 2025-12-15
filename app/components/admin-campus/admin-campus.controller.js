/**
 * Admin Campus Controller
 */
angular.module('campusApp').controller('AdminCampusController', [
    '$scope',
    '$location',
    function ($scope, $location) {
        'use strict';

        // Sample campus data
        $scope.campuses = [
            { name: 'Campus 1', image: 'assets/images/campus-register.png' },
            { name: 'Campus 2', image: 'assets/images/campus-register.png' },
            { name: 'Campus 3', image: 'assets/images/campus-register.png' },
            { name: 'Campus 4', image: 'assets/images/campus-register.png' },
            { name: 'Campus 5', image: 'assets/images/campus-register.png' },
            { name: 'Campus 6', image: 'assets/images/campus-register.png' },
            { name: 'Campus 7', image: 'assets/images/campus-register.png' },
            { name: 'Campus 8', image: 'assets/images/campus-register.png' },
            { name: 'Campus 9', image: 'assets/images/campus-register.png' }
        ];

        // Pagination
        $scope.currentPage = 1;
        $scope.itemsPerPage = 9;

        $scope.totalPages = function () {
            return Math.ceil($scope.campuses.length / $scope.itemsPerPage);
        };

        $scope.paginatedCampuses = function () {
            const start = ($scope.currentPage - 1) * $scope.itemsPerPage;
            return $scope.campuses.slice(start, start + $scope.itemsPerPage);
        };

        $scope.setPage = function (page) {
            if (page > 0 && page <= $scope.totalPages()) {
                $scope.currentPage = page;
            }
        };

        // Button actions
        $scope.viewCampus = function (campus) {
            // TODO: Replace with proper notification service
            // eslint-disable-next-line no-alert
            alert('Viewing ' + campus.name);
        };

        $scope.deleteCampus = function (index) {
            // TODO: Replace with proper confirmation dialog
            // eslint-disable-next-line no-alert
            const confirmDelete = confirm('Are you sure you want to delete this campus?');
            if (confirmDelete) {
                $scope.campuses.splice(index, 1);
            }
        };

        $scope.openAddCampusForm = function () {
            // eslint-disable-next-line no-console
            console.log('PLUS BUTTON CLICKED'); // test
            $location.path('/campus-registration-form');
        };

        $scope.viewCampusById = function (index) {
            $location.path('/view-campus-profile/' + index);
        };
    }
]);
