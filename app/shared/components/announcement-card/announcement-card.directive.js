/**
 * Announcement Card Directive
 * Reusable announcement card component
 */
angular.module('campusApp').directive('appAnnouncementCard', function () {
    return {
        restrict: 'E',
        templateUrl: 'app/shared/components/announcement-card/announcement-card.html',
        scope: {
            date: '@?',
            title: '@',
            description: '@?',
            variant: '@?',
            onAdd: '&?',
            onRemove: '&?',
            showActions: '=?'
        },
        link: function (scope, element, attrs) {
            scope.variant = scope.variant || 'primary';
            scope.showActions = scope.showActions !== false;
        }
    };
});
