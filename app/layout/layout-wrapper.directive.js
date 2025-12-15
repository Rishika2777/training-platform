/**
 * Layout Wrapper Directive
 * Wraps content with layout (header and sidebar) for routes that need it
 */
angular.module('campusApp').directive('layoutWrapper', function () {
    return {
        restrict: 'E',
        transclude: true,
        template:
            '<div class="layout-wrapper">' +
            '<div class="layout-header" ng-include="\'app/layout/header/header.html\'"></div>' +
            '<div class="main-area">' +
            '<div class="left-column"><app-sidebar></app-sidebar></div>' +
            '<div class="right-column"><ng-transclude></ng-transclude></div>' +
            '</div>' +
            '</div>',
        controller: 'DashboardLayoutController'
    };
});
