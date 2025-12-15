/**
 * Post Footer Directive
 * Reusable footer action bar for post cards
 */
angular.module('campusApp').directive('appPostFooter', function () {
    function toBool(value, fallback) {
        if (typeof value === 'boolean') {
            return value;
        }
        return fallback;
    }

    function emitChange(scope) {
        if (!scope.onChange) {
            return;
        }
        scope.onChange({
            state: {
                liked: scope.liked,
                flagged: scope.flagged
            }
        });
    }

    return {
        restrict: 'E',
        templateUrl: 'app/shared/components/post-footer/post-footer.html',
        scope: {
            liked: '=?',
            flagged: '=?',
            onChange: '&?'
        },
        link: function (scope) {
            scope.liked = toBool(scope.liked, false);
            scope.flagged = toBool(scope.flagged, false);

            scope.toggleLike = function () {
                scope.liked = !scope.liked;
                emitChange(scope);
            };

            scope.toggleFlag = function () {
                scope.flagged = !scope.flagged;
                emitChange(scope);
            };
        }
    };
});
