/**
 * FAB Button Directive
 * Circular floating action button component
 */
angular.module('campusApp').directive('appFabButton', function () {
    return {
        restrict: 'E',
        templateUrl: 'app/shared/components/fab-button/fab-button.html',
        scope: {
            type: '@?',
            icon: '@?',
            iconClass: '@?',
            size: '@?',
            variant: '@?',
            disabled: '=?',
            onClick: '&',
            title: '@?'
        },
        link: function (scope, element, attrs) {
            scope.type = scope.type || 'button';
            scope.size = scope.size || 'md';
            scope.variant = scope.variant || 'primary';
            scope.icon = scope.icon || 'plus';
            scope.disabled = scope.disabled || false;
            scope.iconClass = scope.iconClass || 'fa';

            scope.handleClick = function () {
                if (!scope.disabled && scope.onClick) {
                    scope.onClick();
                }
            };
        }
    };
});
