/**
 * Carousel Directive
 * Reusable carousel controls (pagination or arrows)
 */
angular.module('campusApp').directive('appCarousel', function () {
    function parsePositiveInt(value, fallback) {
        const parsed = parseInt(value, 10);
        if (Number.isFinite(parsed) && parsed > 0) {
            return parsed;
        }
        return fallback;
    }

    function clampNumber(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function buildVisiblePages(currentPage, totalPages, maxVisible) {
        const pages = [];
        if (totalPages <= 0) {
            return pages;
        }

        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        const end = Math.min(totalPages, start + maxVisible - 1);

        if (end - start < maxVisible - 1) {
            start = Math.max(1, end - maxVisible + 1);
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        return pages;
    }

    function resolveType(type) {
        return type === 'arrows' ? 'arrows' : 'pagination';
    }

    function emitPageChange(scope, page) {
        if (scope.onPageChange) {
            scope.onPageChange({ page: page });
            return;
        }
        if (scope.onChange) {
            scope.onChange({ page: page });
        }
    }

    function normalizePaging(scope) {
        scope.totalPages = parsePositiveInt(scope.totalPages, 1);
        scope.currentPage = parsePositiveInt(scope.currentPage, 1);
        scope.currentPage = clampNumber(scope.currentPage, 1, scope.totalPages);
    }

    return {
        restrict: 'E',
        templateUrl: 'app/shared/components/carousel/carousel.html',
        transclude: true,
        scope: {
            type: '@?',
            currentPage: '=?',
            totalPages: '=?',
            onPageChange: '&?',
            onChange: '&?',
            maxVisible: '@?',
            arrowSrc: '@?'
        },
        link: function (scope) {
            scope.type = resolveType(scope.type);
            scope.maxVisible = parsePositiveInt(scope.maxVisible, 6);
            scope.arrowSrc = scope.arrowSrc || 'assets/images/carousel-arrow.png';

            normalizePaging(scope);

            scope.getPageNumbers = function () {
                return buildVisiblePages(scope.currentPage, scope.totalPages, scope.maxVisible);
            };

            scope.canGoPrevious = function () {
                return scope.currentPage > 1;
            };

            scope.canGoNext = function () {
                return scope.currentPage < scope.totalPages;
            };

            scope.goToPage = function (page) {
                const nextPage = clampNumber(
                    parsePositiveInt(page, scope.currentPage),
                    1,
                    scope.totalPages
                );
                if (nextPage === scope.currentPage) {
                    return;
                }
                scope.currentPage = nextPage;
                emitPageChange(scope, nextPage);
            };

            scope.goToPrevious = function () {
                if (!scope.canGoPrevious()) {
                    return;
                }
                scope.goToPage(scope.currentPage - 1);
            };

            scope.goToNext = function () {
                if (!scope.canGoNext()) {
                    return;
                }
                scope.goToPage(scope.currentPage + 1);
            };

            scope.$watchGroup(['totalPages', 'currentPage'], function () {
                normalizePaging(scope);
            });

            scope.$watch('type', function (next) {
                scope.type = resolveType(next);
            });
        }
    };
});
