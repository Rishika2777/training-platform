/**
 * Button Directive
 * Reusable button component
 */
angular.module('campusApp').directive('appButton', function () {
    return {
        restrict: 'E',
        templateUrl: 'app/shared/components/button/button.html',
        scope: {
            type: '@?',
            variant: '@?',
            label: '@',
            icon: '@?',
            disabled: '=?',
            onClick: '&'
        },
        link: function (scope, element, attrs) {
            scope.type = scope.type || 'button';
            scope.variant = scope.variant || 'primary';
            scope.disabled = scope.disabled || false;
        }
    };
});
