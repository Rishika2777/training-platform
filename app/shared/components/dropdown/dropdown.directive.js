/**
 * Dropdown Directive
 * Reusable dropdown/select component with validation
 */
angular.module('campusApp').directive('appDropdown', function () {
    return {
        restrict: 'E',
        templateUrl: 'app/shared/components/dropdown/dropdown.html',
        scope: {
            model: '=ngModel',
            options: '=',
            optionValue: '@?',
            optionLabel: '@?',
            placeholder: '@?',
            label: '@?',
            required: '=?',
            disabled: '=?',
            error: '@?'
        },
        link: function (scope, element, attrs) {
            scope.dropdownId = 'dropdown-' + Math.random().toString(36).substr(2, 9);
            scope.optionValue = scope.optionValue || 'value';
            scope.optionLabel = scope.optionLabel || 'label';

            scope.getOptionValue = function (option) {
                if (typeof option === 'object' && option !== null) {
                    return option[scope.optionValue];
                }
                return option;
            };

            scope.getOptionLabel = function (option) {
                if (typeof option === 'object' && option !== null) {
                    return option[scope.optionLabel];
                }
                return option;
            };
        }
    };
});
