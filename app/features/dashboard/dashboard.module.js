/**
 * Dashboard Feature Module
 * Independent dashboard module
 * Accessible to authenticated users (filtered by MenuService for specific roles)
 */
angular.module('campusApp.dashboard', []).run([
    'MenuService',
    'RoleService',
    function (MenuService, RoleService) {
        // Register dashboard menu item
        // Filtered by MenuService.hasAccess() to exclude:
        // - ADMIN/SUPER_ADMIN (they have admin-dashboard)
        // - CAMPUS_USER (they have /campus/home)
        // - STUDENT (they have /student/home)
        // - COMPANY (they have /company/home)
        // Note: Use .run() instead of .config() because services are not available in config blocks
        MenuService.registerMenuItem({
            id: 'dashboard',
            label: 'Dashboard',
            icon: 'fa-home',
            route: '/dashboard/home',
            order: 1,
            module: 'dashboard',
            roles: [] // Filtered by MenuService.hasAccess() for specific roles
        });
    }
]);
