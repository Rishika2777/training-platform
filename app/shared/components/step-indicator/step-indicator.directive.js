/**
 * Step Indicator Directive
 * Multi-step form progress indicator
 */
angular.module('campusApp').directive('appStepIndicator', function () {
    return {
        restrict: 'E',
        templateUrl: 'app/shared/components/step-indicator/step-indicator.html',
        scope: {
            steps: '=',
            currentStep: '=',
            disabled: '=?'
        },
        link: function (scope, element, attrs) {
            scope.disabled = scope.disabled || false;

            scope.isActive = function (index) {
                return index === scope.currentStep;
            };

            scope.isCompleted = function (index) {
                return index < scope.currentStep;
            };

            scope.goToStep = function (index) {
                if (!scope.disabled && index <= scope.currentStep) {
                    scope.currentStep = index;
                }
            };
        }
    };
});
