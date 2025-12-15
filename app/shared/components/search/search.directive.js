/**
 * Search Directive
 * Reusable search component with input and search button
 */
angular.module('campusApp').directive('appSearch', function () {
    return {
        restrict: 'E',
        templateUrl: 'app/shared/components/search/search.html',
        scope: {
            placeholder: '@?',
            model: '=ngModel',
            onSearch: '&?',
            searchBtnIcon: '@?',
            searchBtnColor: '@?'
        },
        link: function (scope, element, attrs) {
            scope.placeholder = scope.placeholder || 'Search for anything';
            scope.searchBtnIcon = scope.searchBtnIcon || 'fa-search';
            scope.searchBtnColor = scope.searchBtnColor || 'secondary';

            scope.handleSearch = function () {
                if (scope.onSearch) {
                    scope.onSearch({ query: scope.model });
                }
            };

            // Allow Enter key to trigger search
            const input = element.find('input');
            input.on('keypress', function (event) {
                if (event.which === 13) {
                    event.preventDefault();
                    scope.handleSearch();
                    scope.$apply();
                }
            });
        }
    };
});
