/**
 * Menu Service
 * Dynamic menu management for modular CRM system
 * Each module can register its menu items independently
 * Supports role-based menu filtering
 */
angular.module('campusApp').service('MenuService', [
    'StorageService',
    'STORAGE_KEYS',
    'RoleService',
    function (StorageService, STORAGE_KEYS, RoleService) {
        'use strict';

        let menuItems = [];
        let menuConfig = null;
        let allMenuItems = []; // Store all items before filtering

        /**
         * Initialize menu from storage or default config
         */
        this.init = function () {
            menuConfig = StorageService.get(STORAGE_KEYS.MENU_CONFIG);
            if (!menuConfig) {
                menuConfig = this.getDefaultMenu();
                StorageService.set(STORAGE_KEYS.MENU_CONFIG, menuConfig);
            }
            menuItems = menuConfig.items || [];
            allMenuItems = angular.copy(menuItems); // Keep copy of all items
        };

        /**
         * Get default menu configuration
         */
        this.getDefaultMenu = function () {
            return {
                items: []
            };
        };

        /**
         * Register menu item from a module
         * This allows modules to add menu items independently
         */
        this.registerMenuItem = function (menuItem) {
            if (!menuItem.id || !menuItem.label) {
                console.error('MenuService: Invalid menu item. Required: id, label');
                return false;
            }

            // Check if item already exists
            const existingIndex = menuItems.findIndex(function (item) {
                return item.id === menuItem.id;
            });

            if (existingIndex >= 0) {
                // Update existing item
                angular.extend(menuItems[existingIndex], menuItem);
                // Update in allMenuItems too
                const allIndex = allMenuItems.findIndex(function (item) {
                    return item.id === menuItem.id;
                });
                if (allIndex >= 0) {
                    angular.extend(allMenuItems[allIndex], menuItem);
                }
            } else {
                // Add new item with role/permission support
                const newItem = {
                    id: menuItem.id,
                    label: menuItem.label,
                    icon: menuItem.icon || 'fa-circle',
                    route: menuItem.route || '#',
                    order: menuItem.order || 999,
                    module: menuItem.module || 'unknown',
                    active: false,
                    children: menuItem.children || [],
                    roles: menuItem.roles || [], // Required roles to see this menu
                    permissions: menuItem.permissions || [] // Required permissions
                };
                menuItems.push(newItem);
                allMenuItems.push(angular.copy(newItem)); // Keep track of all items
            }

            // Sort by order
            this.sortMenuItems();

            // Save to storage
            this.saveMenuConfig();

            return true;
        };

        /**
         * Unregister menu item (when module is removed)
         */
        this.unregisterMenuItem = function (menuId) {
            const index = menuItems.findIndex(function (item) {
                return item.id === menuId;
            });

            if (index >= 0) {
                menuItems.splice(index, 1);
                // Also remove from allMenuItems
                const allIndex = allMenuItems.findIndex(function (item) {
                    return item.id === menuId;
                });
                if (allIndex >= 0) {
                    allMenuItems.splice(allIndex, 1);
                }
                this.saveMenuConfig();
                return true;
            }
            return false;
        };

        /**
         * Get all menu items (filtered by user roles)
         */
        this.getMenuItems = function () {
            // Filter menu items based on user roles/permissions
            return menuItems.filter(
                function (item) {
                    return this.hasAccess(item);
                }.bind(this)
            );
        };

        /**
         * Get all menu items without role filtering (for admin purposes)
         */
        this.getAllMenuItems = function () {
            return allMenuItems;
        };

        /**
         * Check if user has access to menu item
         */
        this.hasAccess = function (menuItem) {
            // Special handling: If user is ADMIN/SUPER_ADMIN and menu item is 'dashboard' (not 'admin-dashboard'), hide it
            // Admin users should see admin-dashboard instead
            if (menuItem.id === 'dashboard' && RoleService.hasAnyRole(['ADMIN', 'SUPER_ADMIN'])) {
                return false;
            }

            // Special handling: Hide 'dashboard' menu item for CAMPUS_USER, STUDENT, and COMPANY
            // These roles have their own home pages and don't need the generic dashboard menu
            if (
                menuItem.id === 'dashboard' &&
                RoleService.hasAnyRole(['CAMPUS_USER', 'STUDENT', 'COMPANY'])
            ) {
                return false;
            }

            // If no roles or permissions specified, allow access
            if (
                (!menuItem.roles || menuItem.roles.length === 0) &&
                (!menuItem.permissions || menuItem.permissions.length === 0)
            ) {
                return true;
            }

            // Check roles
            if (menuItem.roles && menuItem.roles.length > 0) {
                if (!RoleService.hasAnyRole(menuItem.roles)) {
                    return false;
                }
            }

            // Check permissions
            if (menuItem.permissions && menuItem.permissions.length > 0) {
                if (!RoleService.hasPermission(menuItem.permissions)) {
                    return false;
                }
            }

            return true;
        };

        /**
         * Get menu items for a specific module
         */
        this.getMenuItemsByModule = function (moduleName) {
            return menuItems.filter(function (item) {
                return item.module === moduleName;
            });
        };

        /**
         * Set active menu item
         */
        this.setActive = function (menuId) {
            menuItems.forEach(function (item) {
                item.active = item.id === menuId;
            });
        };

        /**
         * Sort menu items by order
         */
        this.sortMenuItems = function () {
            menuItems.sort(function (a, b) {
                return a.order - b.order;
            });
        };

        /**
         * Save menu configuration to storage
         */
        this.saveMenuConfig = function () {
            menuConfig = {
                items: menuItems,
                lastUpdated: new Date().toISOString()
            };
            StorageService.set(STORAGE_KEYS.MENU_CONFIG, menuConfig);
        };

        /**
         * Clear all menu items
         */
        this.clear = function () {
            menuItems = [];
            this.saveMenuConfig();
        };

        /**
         * Reset to default menu
         */
        this.reset = function () {
            menuConfig = this.getDefaultMenu();
            menuItems = menuConfig.items || [];
            allMenuItems = angular.copy(menuItems);
            this.saveMenuConfig();
        };
    }
]);
