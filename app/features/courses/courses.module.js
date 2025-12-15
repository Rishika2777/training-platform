/**
 * Courses Feature Module
 * Independent courses management module
 * Accessible to all authenticated users (view), Admin/Campus Admin/Company (manage)
 * Note: Menu item removed - courses accessible but not shown in menu
 */
angular.module('campusApp.courses', []).run([
    'MenuService',
    function (MenuService) {
        // Remove courses menu item if it exists
        MenuService.unregisterMenuItem('courses');
    }
]);
