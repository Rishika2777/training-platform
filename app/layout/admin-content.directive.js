/**
 * Admin Content Directive
 * Loads admin view templates with their controllers
 */
angular.module('campusApp').directive('adminContent', [
    '$location',
    '$controller',
    function ($location, $controller) {
        return {
            restrict: 'E',
            link: function (scope, element, attrs) {
                const routeMap = {
                    '/admin/campus': {
                        templateUrl:
                            'app/features/admin/views/campus-management/campus-management.html',
                        controller: 'CampusManagementController'
                    },
                    '/admin/student': {
                        templateUrl:
                            'app/features/admin/views/student-management/student-management.html',
                        controller: 'StudentManagementController'
                    },
                    '/admin/company': {
                        templateUrl:
                            'app/features/admin/views/company-management/company-management.html',
                        controller: 'CompanyManagementController'
                    },
                    '/admin/app': {
                        templateUrl: 'app/features/admin/views/app-management/app-management.html',
                        controller: 'AppManagementController'
                    }
                };

                const currentPath = $location.path();
                const routeConfig = routeMap[currentPath];

                if (routeConfig) {
                    // Load template
                    const template = angular.element(
                        '<div ng-include="\'' + routeConfig.templateUrl + '\'"></div>'
                    );
                    element.append(template);

                    // Initialize controller
                    if (routeConfig.controller) {
                        $controller(routeConfig.controller, {
                            $scope: scope
                        });
                    }
                }
            }
        };
    }
]);
