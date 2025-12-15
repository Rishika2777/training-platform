/**
 * Pagination Directive
 * Reusable pagination component
 */
angular.module('campusApp').directive('appPagination', function () {
    return {
        restrict: 'E',
        templateUrl: 'app/shared/components/pagination/pagination.html',
        scope: {
            currentPage: '=',
            totalPages: '=',
            onPageChange: '&',
            maxVisible: '@?'
        },
        link: function (scope, element, attrs) {
            scope.maxVisible = parseInt(scope.maxVisible) || 6;
            scope.currentPage = scope.currentPage || 1;
            scope.totalPages = scope.totalPages || 1;

            scope.goToPage = function (page) {
                if (page >= 1 && page <= scope.totalPages && page !== scope.currentPage) {
                    scope.currentPage = page;
                    if (scope.onPageChange) {
                        scope.onPageChange({ page: page });
                    }
                }
            };

            scope.goToPrevious = function () {
                if (scope.currentPage > 1) {
                    scope.goToPage(scope.currentPage - 1);
                }
            };

            scope.goToNext = function () {
                if (scope.currentPage < scope.totalPages) {
                    scope.goToPage(scope.currentPage + 1);
                }
            };

            scope.getPageNumbers = function () {
                const pages = [];
                let start = Math.max(1, scope.currentPage - Math.floor(scope.maxVisible / 2));
                const end = Math.min(scope.totalPages, start + scope.maxVisible - 1);

                if (end - start < scope.maxVisible - 1) {
                    start = Math.max(1, end - scope.maxVisible + 1);
                }

                for (let i = start; i <= end; i++) {
                    pages.push(i);
                }

                return pages;
            };

            scope.$watch('totalPages', function () {
                if (scope.currentPage > scope.totalPages) {
                    scope.currentPage = scope.totalPages;
                }
            });
        }
    };
});
