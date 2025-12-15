/**
 * Textarea Directive
 * Reusable textarea component with validation
 */
angular.module('campusApp').directive('appTextarea', function () {
    return {
        restrict: 'E',
        templateUrl: 'app/shared/components/textarea/textarea.html',
        require: '?ngModel',
        scope: {
            model: '=ngModel',
            placeholder: '@?',
            label: '@?',
            required: '=?',
            disabled: '=?',
            error: '@?',
            rows: '@?'
        },
        link: function (scope, element, attrs) {
            scope.textareaId = 'textarea-' + Math.random().toString(36).substr(2, 9);
            scope.rows = scope.rows || '4';
        }
    };
});
