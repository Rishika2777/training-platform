/**
 * Auth Feature Module
 * Independent authentication module
 * Registers role-based menu items dynamically
 */
angular.module('campusApp.auth', []).run([
    'MenuService',
    'StorageService',
    'ROLE_MENU_CONFIG',
    'STORAGE_KEYS',
    '$rootScope',
    function (MenuService, StorageService, ROLE_MENU_CONFIG, STORAGE_KEYS, $rootScope) {
        'use strict';

        /**
         * Register menu items for a specific role
         * @param {string} role - User role
         */
        function registerMenusForRole(role) {
            const menuItems = ROLE_MENU_CONFIG.getMenuItemsForRole(role);
            if (menuItems && menuItems.length > 0) {
                menuItems.forEach(function (menuItem) {
                    MenuService.registerMenuItem({
                        id: menuItem.id,
                        label: menuItem.label,
                        icon: menuItem.icon,
                        route: menuItem.route,
                        order: menuItem.order,
                        module: menuItem.module,
                        roles: [role] // Set role requirement for this menu item
                    });
                });
            }
        }

        /**
         * Clear role-based menu items
         * @param {string} role - User role
         */
        function clearMenusForRole(role) {
            const menuItems = ROLE_MENU_CONFIG.getMenuItemsForRole(role);
            if (menuItems && menuItems.length > 0) {
                menuItems.forEach(function (menuItem) {
                    MenuService.unregisterMenuItem(menuItem.id);
                });
            }
        }

        /**
         * Initialize menus based on current user
         */
        function initializeMenus() {
            const userData = StorageService.get(STORAGE_KEYS.USER_DATA);
            if (userData && userData.role) {
                registerMenusForRole(userData.role);
            }
        }

        // Watch for user login/logout to update menus
        $rootScope.$watch(
            function () {
                return StorageService.get(STORAGE_KEYS.USER_DATA);
            },
            function (newUser, oldUser) {
                // Clear old user's menus if logged out or role changed
                if (oldUser && oldUser.role) {
                    const oldRole = oldUser.role;
                    if (!newUser || newUser.role !== oldRole) {
                        clearMenusForRole(oldRole);
                    }
                }

                // Register new user's menus if logged in
                if (newUser && newUser.role) {
                    const newRole = newUser.role;
                    // Only register if role changed or user just logged in
                    if (!oldUser || oldUser.role !== newRole) {
                        registerMenusForRole(newRole);
                    }
                }
            },
            true
        );

        // Initialize menus on app start if user is already logged in
        initializeMenus();
    }
]);
