/**
 * Role Service
 * Manages user roles and permissions for RBAC
 */
angular.module('campusApp').service('RoleService', [
    'StorageService',
    'STORAGE_KEYS',
    'USER_ROLES',
    'ROLE_HIERARCHY',
    function (StorageService, STORAGE_KEYS, USER_ROLES, ROLE_HIERARCHY) {
        'use strict';

        /**
         * Get current user
         */
        this.getCurrentUser = function () {
            return StorageService.get(STORAGE_KEYS.USER_DATA);
        };

        /**
         * Get user roles
         * Returns array of roles for the current user
         */
        this.getUserRoles = function () {
            const user = this.getCurrentUser();
            if (!user) {
                return [];
            }

            // Support both single role and array of roles
            if (Array.isArray(user.roles)) {
                return user.roles;
            } else if (user.role) {
                return [user.role];
            } else if (user.roles) {
                return [user.roles];
            }

            return [];
        };

        /**
         * Check if user has a specific role
         */
        this.hasRole = function (role) {
            const userRoles = this.getUserRoles();
            return userRoles.indexOf(role) !== -1;
        };

        /**
         * Check if user has any of the specified roles
         */
        this.hasAnyRole = function (roles) {
            if (!Array.isArray(roles) || roles.length === 0) {
                return true; // No role requirement means accessible to all
            }

            const userRoles = this.getUserRoles();
            return roles.some(function (role) {
                return userRoles.indexOf(role) !== -1;
            });
        };

        /**
         * Check if user has all of the specified roles
         */
        this.hasAllRoles = function (roles) {
            if (!Array.isArray(roles) || roles.length === 0) {
                return true;
            }

            const userRoles = this.getUserRoles();
            return roles.every(function (role) {
                return userRoles.indexOf(role) !== -1;
            });
        };

        /**
         * Check if user has minimum role level
         * Uses ROLE_HIERARCHY to determine access level
         */
        this.hasMinimumRole = function (requiredRole) {
            const userRoles = this.getUserRoles();
            if (userRoles.length === 0) {
                return false;
            }

            const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;

            // Check if user has any role with equal or higher level
            return userRoles.some(function (userRole) {
                const userLevel = ROLE_HIERARCHY[userRole] || 0;
                return userLevel >= requiredLevel;
            });
        };

        /**
         * Check if user has permission
         * Permissions can be roles or specific permission strings
         */
        this.hasPermission = function (permissions) {
            if (!permissions || (Array.isArray(permissions) && permissions.length === 0)) {
                return true; // No permission requirement
            }

            if (!Array.isArray(permissions)) {
                permissions = [permissions];
            }

            const userRoles = this.getUserRoles();
            const user = this.getCurrentUser();
            const userPermissions = user && user.permissions ? user.permissions : [];

            // Check if user has any of the required permissions or roles
            return permissions.some(function (permission) {
                // Check role
                if (userRoles.indexOf(permission) !== -1) {
                    return true;
                }
                // Check permission
                if (userPermissions.indexOf(permission) !== -1) {
                    return true;
                }
                return false;
            });
        };

        /**
         * Get role hierarchy level
         */
        this.getRoleLevel = function (role) {
            return ROLE_HIERARCHY[role] || 0;
        };

        /**
         * Check if user is authenticated
         */
        this.isAuthenticated = function () {
            const user = this.getCurrentUser();
            const token = StorageService.get(STORAGE_KEYS.AUTH_TOKEN);
            return !!(user && token);
        };

        /**
         * Check if user is admin (ADMIN or SUPER_ADMIN)
         */
        this.isAdmin = function () {
            return this.hasAnyRole([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]);
        };

        /**
         * Check if user is super admin
         */
        this.isSuperAdmin = function () {
            return this.hasRole(USER_ROLES.SUPER_ADMIN);
        };
    }
]);
