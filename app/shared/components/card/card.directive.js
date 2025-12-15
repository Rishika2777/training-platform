/**
 * Card Directive
 * Reusable card component with image, text, and action buttons
 */
angular.module('campusApp').directive('appCard', [
    function () {
        return {
            restrict: 'E',
            templateUrl: 'app/shared/components/card/card.html',
            transclude: true,
            scope: {
                imageSrc: '@?',
                imageAlt: '@?',
                imageShape: '@?',
                title: '@?',
                subtitle: '@?',
                description: '@?',
                onClick: '&?',
                cardClass: '@?'
            },
            link: function (scope) {
                scope.imageShape = scope.imageShape || 'rectangle';

                scope.handleCardClick = function () {
                    if (scope.onClick) {
                        scope.onClick();
                    }
                };
            }
        };
    }
]);
