/**
 * Campus Feature Module
 * Independent campus management module
 * Accessible to Admin, Super Admin, and Campus Admin only
 */
angular.module('campusApp.campus', []).run([
    'MenuService',
    function (MenuService) {
        // Register campus menu items - Only for CAMPUS_ADMIN (not ADMIN/SUPER_ADMIN as they have admin-campus)
        // Note: Use .run() instead of .config() because services are not available in config blocks
        MenuService.registerMenuItem({
            id: 'campus',
            label: 'Campus Management',
            icon: 'fa-building',
            route: '/admin/campus',
            order: 2,
            module: 'campus',
            roles: ['CAMPUS_ADMIN'] // Only campus admin, not regular admin (they use admin-campus)
        });
    }
]);
