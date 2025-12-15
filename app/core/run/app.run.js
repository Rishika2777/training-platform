/**
 * App Run Block
 * Initialize application on startup
 * Handles route guards and role-based access control
 */
angular.module('campusApp').run([
    '$rootScope',
    '$location',
    'MenuService',
    'StorageService',
    'RoleService',
    'ErrorHandlerService',
    'APP_CONFIG',
    'STORAGE_KEYS',
    'ROUTES',
    function (
        $rootScope,
        $location,
        MenuService,
        StorageService,
        RoleService,
        ErrorHandlerService,
        APP_CONFIG,
        STORAGE_KEYS,
        ROUTES
    ) {
        'use strict';

        // ============================================
        // CLEAR CACHE ON APP START (Development Mode)
        // ============================================
        // Get configuration from APP_CONFIG constant
        // This will clear all authentication data on every app start if enabled
        const CLEAR_CACHE_ON_START = APP_CONFIG.CLEAR_CACHE_ON_START || false;

        if (CLEAR_CACHE_ON_START) {
            // Clear all authentication data
            StorageService.remove(STORAGE_KEYS.AUTH_TOKEN);
            StorageService.remove(STORAGE_KEYS.REFRESH_TOKEN);
            StorageService.remove(STORAGE_KEYS.USER_DATA);
            // eslint-disable-next-line no-console
            console.log('Cache cleared on app start (Development Mode)');
        }

        // Initialize menu service
        MenuService.init();

        // Set root scope variables
        $rootScope.appName = 'Synkup CRM';
        $rootScope.currentUser = StorageService.get(STORAGE_KEYS.USER_DATA);
        $rootScope.currentUserRoles = RoleService.getUserRoles();

        // Watch for user changes to update menu
        $rootScope.$watch(
            function () {
                return StorageService.get(STORAGE_KEYS.USER_DATA);
            },
            function (newUser) {
                $rootScope.currentUser = newUser;
                $rootScope.currentUserRoles = RoleService.getUserRoles();
                // Menu will automatically filter based on roles
            },
            true
        );

        // Route change handler with role-based access control
        $rootScope.$on('$routeChangeStart', function (event, next, current) {
            if (!next || !next.$$route) {
                return;
            }

            const route = next.$$route;
            const requiresAuth = route.requiresAuth !== false;
            const isAuthRoute =
                route.originalPath === '/login' ||
                route.originalPath === '/register' ||
                route.originalPath === '/register-options' ||
                route.originalPath === '/register-campus' ||
                route.originalPath === '/register-student' ||
                route.originalPath === '/register-company' ||
                route.originalPath === '/';

            const token = StorageService.get(STORAGE_KEYS.AUTH_TOKEN);
            const userData = StorageService.get(STORAGE_KEYS.USER_DATA);

            // Update root scope with current user data for RoleService to access
            if (userData) {
                $rootScope.currentUser = userData;
                $rootScope.currentUserRoles = RoleService.getUserRoles();
            }

            // Handle root route - check if user is logged in
            if (route.originalPath === '/') {
                if (token) {
                    // User is logged in, redirect based on role
                    event.preventDefault();
                    const userData = StorageService.get(STORAGE_KEYS.USER_DATA);
                    const userRole =
                        userData && (userData.role || (userData.roles && userData.roles[0]));

                    if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
                        $location.path('/admin/dashboard');
                    } else if (userRole === 'CAMPUS_USER') {
                        $location.path('/campus/home');
                    } else if (userRole === 'STUDENT') {
                        $location.path('/student/home');
                    } else if (userRole === 'COMPANY') {
                        $location.path('/company/home');
                    } else {
                        $location.path(ROUTES.DASHBOARD_HOME);
                    }
                    return;
                }
                // User not logged in, show landing page (allow route to continue)
                return;
            }

            // Check authentication
            if (requiresAuth && !token && !isAuthRoute) {
                event.preventDefault();
                $location.path(ROUTES.LOGIN);
                return;
            }

            // Check role-based access
            if (requiresAuth && token && route.requiredRoles) {
                const requiredRoles = route.requiredRoles;
                const userData = StorageService.get(STORAGE_KEYS.USER_DATA);
                const userRoles = userData
                    ? userData.roles || (userData.role ? [userData.role] : [])
                    : [];

                // If empty array, allow all authenticated users
                if (requiredRoles.length > 0) {
                    // Check if user has any of the required roles
                    const hasAccess = requiredRoles.some(function (role) {
                        return userRoles.indexOf(role) !== -1;
                    });

                    if (!hasAccess) {
                        event.preventDefault();
                        ErrorHandlerService.showError(
                            'You do not have permission to access this page.'
                        );
                        // Redirect to role-specific home page based on actual user role
                        const userRole =
                            userData && (userData.role || (userData.roles && userData.roles[0]));
                        if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
                            $location.path('/admin/dashboard');
                        } else if (userRole === 'CAMPUS_USER') {
                            $location.path('/campus/home');
                        } else if (userRole === 'STUDENT') {
                            $location.path('/student/home');
                        } else if (userRole === 'COMPANY') {
                            $location.path('/company/home');
                        } else {
                            $location.path(ROUTES.DASHBOARD_HOME);
                        }
                        return;
                    }
                }
            }

            // Redirect authenticated users away from auth pages (but allow login page during login process)
            if (isAuthRoute && token && route.originalPath !== '/login') {
                event.preventDefault();
                // Redirect based on role - read directly from storage
                const userData = StorageService.get(STORAGE_KEYS.USER_DATA);
                const userRole =
                    userData && (userData.role || (userData.roles && userData.roles[0]));

                if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
                    $location.path('/admin/dashboard');
                } else if (userRole === 'CAMPUS_USER') {
                    $location.path('/campus/home');
                } else if (userRole === 'STUDENT') {
                    $location.path('/student/home');
                } else if (userRole === 'COMPANY') {
                    $location.path('/company/home');
                } else {
                    $location.path(ROUTES.DASHBOARD_HOME);
                }
            }
        });

        // Route change success handler
        $rootScope.$on('$routeChangeSuccess', function (event, current) {
            // Update active menu item
            if (current && current.$$route) {
                const routePath = current.$$route.originalPath;
                // Find menu item by route and set active
                const menuItems = MenuService.getMenuItems();
                menuItems.forEach(function (item) {
                    if (routePath === item.route || routePath.startsWith(item.route)) {
                        MenuService.setActive(item.id);
                    }
                });
            }
        });
    }
]);
