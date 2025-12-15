/**
 * Card Action Button Directive
 * Helper directive for card action buttons
 */
angular.module('campusApp').directive('appCardAction', function () {
    return {
        restrict: 'E',
        template:
            '<button class="app-card-action-btn app-card-action-btn-{{variant}}" ng-click="handleClick($event)" ng-disabled="disabled">{{label}}</button>',
        scope: {
            label: '@',
            variant: '@?',
            onClick: '&',
            disabled: '=?'
        },
        link: function (scope, element, attrs) {
            scope.variant = scope.variant || 'primary';
            scope.handleClick = function ($event) {
                if ($event && $event.stopPropagation) {
                    $event.stopPropagation();
                }
                scope.onClick();
            };
        }
    };
});
