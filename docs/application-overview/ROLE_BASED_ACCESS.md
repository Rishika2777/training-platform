# Role-Based Access Control (RBAC) Documentation

## Overview

The CRM application implements comprehensive Role-Based Access Control (RBAC) for both **menus** and **routes**. Users only see menu items and can only access routes that match their assigned roles.

## User Roles

The system supports the following roles (defined in `app/core/constants/app.constants.js`):

```javascript
USER_ROLES: {
    SUPER_ADMIN: 'SUPER_ADMIN',    // Highest level - all access
    ADMIN: 'ADMIN',                 // System administrator
    CAMPUS_ADMIN: 'CAMPUS_ADMIN',   // Campus-specific admin
    COMPANY: 'COMPANY',             // Company user
    STUDENT: 'STUDENT',             // Student user
    USER: 'USER'                    // Basic user
}
```

### Role Hierarchy

Roles have a hierarchy system for permission checking:

```javascript
ROLE_HIERARCHY: {
    SUPER_ADMIN: 100,    // Highest
    ADMIN: 80,
    CAMPUS_ADMIN: 60,
    COMPANY: 40,
    STUDENT: 20,
    USER: 10             // Lowest
}
```

## How It Works

### 1. Menu Filtering

Menu items are automatically filtered based on user roles:

```javascript
MenuService.registerMenuItem({
    id: 'campus',
    label: 'Campus Management',
    icon: 'fa-building',
    route: '/admin-campus',
    order: 2,
    module: 'campus',
    roles: ['ADMIN', 'SUPER_ADMIN', 'CAMPUS_ADMIN'] // Only these roles see this menu
});
```

**Rules:**
- If `roles` is empty array `[]` or not specified → **All authenticated users** can see it
- If `roles` is specified → **Only users with matching roles** can see it
- Menu automatically updates when user roles change

### 2. Route Protection

Routes are protected with role-based guards:

```javascript
.when("/admin-campus", {
    templateUrl: "app/features/campus/views/admin-campus.html",
    controller: "AdminCampusController",
    requiresAuth: true,
    requiredRoles: ['ADMIN', 'SUPER_ADMIN', 'CAMPUS_ADMIN'] // Role requirement
})
```

**Rules:**
- If `requiredRoles` is empty array `[]` → **All authenticated users** can access
- If `requiredRoles` is specified → **Only users with matching roles** can access
- Unauthorized access redirects to dashboard with error message

## Usage Examples

### Registering Menu Items with Roles

```javascript
// Example 1: Accessible to all authenticated users
MenuService.registerMenuItem({
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'fa-home',
    route: '/dashboard/home',
    order: 1,
    module: 'dashboard',
    roles: [] // Empty = all authenticated users
});

// Example 2: Admin only
MenuService.registerMenuItem({
    id: 'admin-panel',
    label: 'Admin Panel',
    icon: 'fa-cog',
    route: '/admin',
    order: 10,
    module: 'admin',
    roles: ['ADMIN', 'SUPER_ADMIN']
});

// Example 3: Multiple roles
MenuService.registerMenuItem({
    id: 'reports',
    label: 'Reports',
    icon: 'fa-chart-bar',
    route: '/reports',
    order: 5,
    module: 'reports',
    roles: ['ADMIN', 'CAMPUS_ADMIN', 'COMPANY']
});
```

### Configuring Routes with Roles

```javascript
// Public route (no auth required)
.when("/login", {
    templateUrl: "app/features/auth/views/login.html",
    controller: "LoginController",
    requiresAuth: false
})

// Authenticated route - all users
.when("/dashboard/home", {
    templateUrl: "app/features/dashboard/views/dashboard.html",
    controller: "DashboardController",
    requiresAuth: true,
    requiredRoles: [] // All authenticated users
})

// Admin only route
.when("/admin/users", {
    templateUrl: "app/features/admin/views/users.html",
    controller: "UsersController",
    requiresAuth: true,
    requiredRoles: ['ADMIN', 'SUPER_ADMIN']
})

// Multiple roles
.when("/courses/manage", {
    templateUrl: "app/features/courses/views/manage.html",
    controller: "ManageCoursesController",
    requiresAuth: true,
    requiredRoles: ['ADMIN', 'CAMPUS_ADMIN', 'COMPANY']
})
```

## RoleService API

### Check User Roles

```javascript
// Inject RoleService
.controller('MyController', ['RoleService', function(RoleService) {
    
    // Check if user has specific role
    if (RoleService.hasRole('ADMIN')) {
        // User is admin
    }
    
    // Check if user has any of the roles
    if (RoleService.hasAnyRole(['ADMIN', 'SUPER_ADMIN'])) {
        // User is admin or super admin
    }
    
    // Check if user has all roles
    if (RoleService.hasAllRoles(['ADMIN', 'CAMPUS_ADMIN'])) {
        // User has both roles
    }
    
    // Check minimum role level
    if (RoleService.hasMinimumRole('ADMIN')) {
        // User has ADMIN or higher level role
    }
    
    // Get user roles
    var roles = RoleService.getUserRoles(); // Returns array
    
    // Check if admin
    if (RoleService.isAdmin()) {
        // User is ADMIN or SUPER_ADMIN
    }
    
    // Check if super admin
    if (RoleService.isSuperAdmin()) {
        // User is SUPER_ADMIN
    }
}]);
```

### Check Permissions

```javascript
// Check if user has permission
if (RoleService.hasPermission('MANAGE_USERS')) {
    // User has permission
}

// Check multiple permissions (any)
if (RoleService.hasPermission(['MANAGE_USERS', 'VIEW_REPORTS'])) {
    // User has at least one permission
}
```

## User Data Structure

The user object should have roles in one of these formats:

```javascript
// Format 1: Single role
{
    id: 1,
    name: 'John Doe',
    role: 'ADMIN'
}

// Format 2: Array of roles
{
    id: 1,
    name: 'John Doe',
    roles: ['ADMIN', 'CAMPUS_ADMIN']
}

// Format 3: With permissions
{
    id: 1,
    name: 'John Doe',
    roles: ['ADMIN'],
    permissions: ['MANAGE_USERS', 'VIEW_REPORTS']
}
```

## Current Role Configuration

### Dashboard Module
- **Menu**: All authenticated users
- **Routes**: All authenticated users

### Campus Module
- **Menu**: ADMIN, SUPER_ADMIN, CAMPUS_ADMIN
- **Routes**: ADMIN, SUPER_ADMIN, CAMPUS_ADMIN

### Courses Module
- **Menu**: All authenticated users
- **Routes**: 
  - View: All authenticated users
  - Manage: ADMIN, SUPER_ADMIN, CAMPUS_ADMIN, COMPANY

## Adding Role-Based Access to New Module

### Step 1: Register Menu with Roles

```javascript
// app/features/your-module/your-module.module.js
angular.module('campusApp.yourModule', [])
    .config(['MenuService', function(MenuService) {
        MenuService.registerMenuItem({
            id: 'your-module',
            label: 'Your Module',
            icon: 'fa-icon',
            route: '/your-module',
            order: 5,
            module: 'yourModule',
            roles: ['ADMIN', 'SUPER_ADMIN'] // Specify required roles
        });
    }]);
```

### Step 2: Protect Routes

```javascript
// app/config/routes.config.js
.when("/your-module", {
    templateUrl: "app/features/your-module/views/your-module.html",
    controller: "YourModuleController",
    requiresAuth: true,
    requiredRoles: ['ADMIN', 'SUPER_ADMIN'] // Match menu roles
})
```

### Step 3: Use in Controllers (Optional)

```javascript
// app/features/your-module/controllers/your-module.controller.js
.controller('YourModuleController', ['RoleService', function(RoleService) {
    // Check role before showing features
    this.canEdit = RoleService.hasRole('ADMIN');
    this.canDelete = RoleService.isSuperAdmin();
}]);
```

## Testing Roles

### Test Different Roles

1. **Login as different users** with different roles
2. **Check menu visibility** - only authorized items should appear
3. **Try accessing routes directly** - unauthorized routes should redirect
4. **Check console** - no errors should appear

### Example Test Scenarios

```javascript
// User with role: ['STUDENT']
// Should see: Dashboard, Courses (view only)
// Should NOT see: Campus Management

// User with role: ['ADMIN']
// Should see: Dashboard, Campus Management, Courses
// Can access: All routes

// User with role: ['COMPANY']
// Should see: Dashboard, Courses
// Can access: Dashboard, Courses (view), Course form (create)
```

## Best Practices

1. **Consistent Roles**: Use same roles for menu and routes
2. **Empty Array**: Use `[]` for "all authenticated users"
3. **Multiple Roles**: Use array for multiple allowed roles
4. **Hierarchy**: Use `hasMinimumRole()` for hierarchical checks
5. **Permissions**: Use permissions for fine-grained control

## Troubleshooting

### Menu Item Not Showing
- Check user has required role: `RoleService.getUserRoles()`
- Verify menu item has correct `roles` array
- Check menu item is registered in module config

### Route Access Denied
- Check route has `requiredRoles` configured
- Verify user has matching role
- Check `requiresAuth: true` is set

### Role Not Working
- Verify user object has `role` or `roles` property
- Check role name matches exactly (case-sensitive)
- Ensure RoleService is loaded before MenuService

## Security Notes

⚠️ **Important**: 
- Role checks on frontend are for **UX only**
- **Backend must validate** all role-based access
- Never trust frontend role checks for security
- Always verify roles on API endpoints

---

**RBAC is fully implemented and active!** Menus and routes are automatically filtered based on user roles.

