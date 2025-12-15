/**
 * View Campus Profile Controller
 */
angular.module('campusApp').controller('ViewCampusProfileController', [
    '$scope',
    '$location',
    '$routeParams',
    function ($scope, $location, $routeParams) {
        'use strict';

        const _id = $routeParams.id; // ID from route params (prefixed with _ to indicate intentionally unused for now)

        // Dummy data (same data as your adminCampusController)
        $scope.campuses = [
            {
                name: 'Mangalore University',
                rank: 'A+',
                adminName: 'Ankith Shenoy',
                adminEmail: 'Ankith@mlore.com',
                phone: '+91 6895493823',
                dept: 'CS',
                designation: 'HOD',
                website: 'www.mloreuniversity.com',
                otherUrl: '',
                about: '',
                address: 'Mangalore University, 574 199, Karnataka State, India',
                tagline: '',
                research: '',
                image: 'assets/images/campus-register.png'
            }
        ];
        $scope.goBack = function () {
            $location.path('/admin/campus');
        };
    }
]);
