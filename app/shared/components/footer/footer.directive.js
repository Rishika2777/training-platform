/**
 * Footer Directive
 * Reusable footer component
 */
angular.module('campusApp').directive('appFooter', function () {
    return {
        restrict: 'E',
        templateUrl: 'app/shared/components/footer/footer.html',
        scope: {
            copyright: '@?'
        },
        controller: [
            '$scope',
            function ($scope) {
                $scope.currentYear = new Date().getFullYear();
                $scope.copyright =
                    $scope.copyright ||
                    '© ' + $scope.currentYear + ' Clavrit Digital Solutions. All rights reserved.';
            }
        ]
    };
});
