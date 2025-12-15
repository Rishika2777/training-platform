/**
 * Header Controller
 */
angular.module('campusApp').controller('headerController', [
    '$scope',
    '$location',
    'MenuService',
    '$rootScope',
    function ($scope, $location, MenuService, $rootScope) {
        'use strict';

        // Initialize page title
        $scope.pageTitle = 'Page title';

        /**
         * Get menu item label for current route
         */
        function updatePageTitle() {
            const currentPath = $location.path();
            const allMenuItems = MenuService.getAllMenuItems();
            let matchingItem = null;

            // Special-case Settings routes (not part of sidebar menu)
            if (currentPath && currentPath.startsWith('/settings')) {
                $scope.pageTitle = 'Settings';
                return;
            }

            // First, try exact route match
            matchingItem = allMenuItems.find(function (item) {
                return item.route === currentPath;
            });

            // If no exact match, try pattern matching
            if (!matchingItem) {
                // Handle admin routes
                if (currentPath.startsWith('/admin/')) {
                    matchingItem = allMenuItems.find(function (item) {
                        return (
                            item.route === currentPath ||
                            (item.id && item.id.startsWith('admin-') && item.route === currentPath)
                        );
                    });
                }
                // Handle dashboard routes
                else if (currentPath === '/dashboard' || currentPath === '/dashboard/home') {
                    // Check if user is admin (should show admin dashboard)
                    const isAdmin = allMenuItems.some(function (item) {
                        return item.id === 'admin-dashboard';
                    });
                    matchingItem = allMenuItems.find(function (item) {
                        return isAdmin ? item.id === 'admin-dashboard' : item.id === 'dashboard';
                    });
                }
            }

            // Set page title
            if (matchingItem && matchingItem.label) {
                $scope.pageTitle = matchingItem.label;
            } else {
                // Fallback: format route name
                const routeParts = currentPath.split('/').filter(function (part) {
                    return part && part !== '';
                });
                const routeName = routeParts[routeParts.length - 1] || 'Dashboard';
                $scope.pageTitle =
                    routeName.charAt(0).toUpperCase() + routeName.slice(1).replace(/-/g, ' ');
            }
        }

        // Update title on route change
        $rootScope.$on('$routeChangeSuccess', function () {
            updatePageTitle();
        });

        // Also watch location changes as backup
        $scope.$watch(
            function () {
                return $location.path();
            },
            function (newPath, oldPath) {
                if (newPath !== oldPath) {
                    updatePageTitle();
                }
            }
        );

        // Initial update
        updatePageTitle();

        // Search bar visibility - can be controlled dynamically
        $scope.showSearch = false; // Set to true to show search bar, false to hide

        // Header dropdown menus
        $scope.isNotificationsOpen = false;
        $scope.isSettingsOpen = false;

        function closeAllMenus() {
            $scope.isNotificationsOpen = false;
            $scope.isSettingsOpen = false;
        }

        // Search functionality
        $scope.searchQuery = '';
        $scope.handleSearch = function (query) {
            if (query && query.query) {
                // Handle search logic here
                // eslint-disable-next-line no-console
                console.log('Searching for:', query.query);
                // You can implement search navigation or filtering here
            }
        };

        $scope.goDashboard = function () {
            $location.path('/dashboard/home');
        };

        $scope.toggleNotifications = function ($event) {
            if ($event && typeof $event.stopPropagation === 'function') {
                $event.stopPropagation();
            }
            $scope.isNotificationsOpen = !$scope.isNotificationsOpen;
            if ($scope.isNotificationsOpen) {
                $scope.isSettingsOpen = false;
            }
        };

        $scope.toggleSettings = function ($event) {
            if ($event && typeof $event.stopPropagation === 'function') {
                $event.stopPropagation();
            }
            $scope.isSettingsOpen = !$scope.isSettingsOpen;
            if ($scope.isSettingsOpen) {
                $scope.isNotificationsOpen = false;
            }
        };

        $scope.closeNotifications = function () {
            $scope.isNotificationsOpen = false;
        };

        $scope.closeSettings = function () {
            $scope.isSettingsOpen = false;
        };

        // Close menus on navigation
        $rootScope.$on('$routeChangeStart', function () {
            closeAllMenus();
        });
    }
]);
