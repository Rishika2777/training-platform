/**
 * Admin Feature Module
 * Independent admin management module
 * Accessible to ADMIN and SUPER_ADMIN roles
 */
angular.module('campusApp.admin', []).run([
    'MenuService',
    function (MenuService) {
        // Register Dashboard menu item for admin
        MenuService.registerMenuItem({
            id: 'admin-dashboard',
            label: 'Dashboard',
            icon: 'fa-home',
            route: '/admin/dashboard',
            order: 1,
            module: 'admin',
            roles: ['ADMIN', 'SUPER_ADMIN']
        });

        // Register admin menu items
        MenuService.registerMenuItem({
            id: 'admin-campus',
            label: 'Campus Management',
            icon: 'fa-building',
            route: '/admin/campus',
            order: 2,
            module: 'admin',
            roles: ['ADMIN', 'SUPER_ADMIN']
        });

        MenuService.registerMenuItem({
            id: 'admin-student',
            label: 'Student Management',
            icon: 'fa-user-graduate',
            route: '/admin/student',
            order: 3,
            module: 'admin',
            roles: ['ADMIN', 'SUPER_ADMIN']
        });

        MenuService.registerMenuItem({
            id: 'admin-company',
            label: 'Company Management',
            icon: 'fa-briefcase',
            route: '/admin/company',
            order: 4,
            module: 'admin',
            roles: ['ADMIN', 'SUPER_ADMIN']
        });

        MenuService.registerMenuItem({
            id: 'admin-app',
            label: 'App Management',
            icon: 'fa-cog',
            route: '/admin/app',
            order: 5,
            module: 'admin',
            roles: ['ADMIN', 'SUPER_ADMIN']
        });
    }
]);
