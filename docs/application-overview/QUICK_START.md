# Quick Start Guide - CRM Application

## What Has Been Implemented

### ✅ Enterprise Architecture
- Modular feature-based structure
- Independent modules that don't break each other
- Dynamic menu system
- Centralized API service for Swagger integration

### ✅ Core Services
- **ApiService**: Handles all HTTP requests with automatic token injection
- **StorageService**: LocalStorage/SessionStorage management
- **ErrorHandlerService**: Centralized error handling
- **MenuService**: Dynamic menu management

### ✅ Shared Components
- Button component
- Input component
- Footer component
- Sidebar with dynamic menu

### ✅ Theme System
- CSS variables for easy customization
- Consistent colors, spacing, fonts

## How to Add a New Module

### Example: Adding a "Students" Module

1. **Create module structure:**
```
app/features/students/
├── students.module.js
├── services/
│   └── students.service.js
└── views/
    └── students-list.html
```

2. **Create module file:**
```javascript
// app/features/students/students.module.js
angular.module('campusApp.students', [])
    .config(['MenuService', function(MenuService) {
        MenuService.registerMenuItem({
            id: 'students',
            label: 'Students',
            icon: 'fa-user-graduate',
            route: '/students',
            order: 4,
            module: 'students'
        });
    }]);
```

3. **Create service:**
```javascript
// app/features/students/services/students.service.js
angular.module('campusApp.students')
    .service('StudentsService', ['ApiService', 'ErrorHandlerService', 'API_ENDPOINTS', 
        function(ApiService, ErrorHandlerService, API_ENDPOINTS) {
            this.getAll = function() {
                return ApiService.get(API_ENDPOINTS.STUDENTS.LIST);
            };
        }]);
```

4. **Add to app.module.js:**
```javascript
var app = angular.module("campusApp", [
    "ngRoute",
    "campusApp.students"  // Add here
]);
```

5. **Add API endpoint in constants:**
```javascript
// app/core/constants/app.constants.js
.constant('API_ENDPOINTS', {
    STUDENTS: {
        BASE: '/students',
        LIST: '/students',
        CREATE: '/students',
        UPDATE: '/students/:id',
        DELETE: '/students/:id'
    }
});
```

6. **Add route:**
```javascript
// app/config/routes.config.js
$routeProvider.when("/students", {
    templateUrl: "app/features/students/views/students-list.html",
    controller: "StudentsListController",
    requiresAuth: true
});
```

7. **Load in index.html:**
```html
<!-- Feature Modules -->
<script src="app/features/students/students.module.js"></script>
<script src="app/features/students/services/students.service.js"></script>
```

**That's it!** The menu item will automatically appear, and the module is completely independent.

## API Integration with Swagger

### Update API Base URL
```javascript
// app/core/constants/app.constants.js
.constant('APP_CONFIG', {
    API_BASE_URL: 'http://your-api-url:port/api',
    SWAGGER_DOCS_URL: 'http://your-api-url:port/api-docs'
});
```

### Using API Service
```javascript
// In your service
this.getData = function() {
    return ApiService.get(API_ENDPOINTS.YOUR_MODULE.LIST);
};

this.create = function(data) {
    return ApiService.post(API_ENDPOINTS.YOUR_MODULE.CREATE, data);
};

this.update = function(id, data) {
    return ApiService.put(API_ENDPOINTS.YOUR_MODULE.UPDATE, data, { id: id });
};

this.delete = function(id) {
    return ApiService.delete(API_ENDPOINTS.YOUR_MODULE.DELETE, { id: id });
};
```

## Menu System

### Register Menu Item
```javascript
MenuService.registerMenuItem({
    id: 'unique-id',
    label: 'Menu Label',
    icon: 'fa-icon-class',  // Font Awesome class
    route: '/route-path',
    order: 5,  // Lower = appears first
    module: 'moduleName'
});
```

### Remove Menu Item
```javascript
MenuService.unregisterMenuItem('menu-id');
```

## Theme Customization

Edit `app/shared/css/theme.css`:

```css
:root {
    --color-primary: #557F87;  /* Change primary color */
    --color-secondary: #F29D52; /* Change secondary color */
    /* ... more variables ... */
}
```

## Key Benefits

1. **Modular**: Add/remove modules without breaking existing code
2. **Scalable**: Easy to add new features
3. **Maintainable**: Clear separation of concerns
4. **Swagger Ready**: API service ready for Swagger integration
5. **Dynamic Menu**: Menu updates automatically when modules are added
6. **Theme System**: Easy to customize appearance
7. **Reusable Components**: Shared UI components

## Next Steps

1. Update `API_BASE_URL` in constants
2. Migrate existing controllers to feature modules
3. Add more shared components as needed
4. Customize theme colors
5. Add authentication guards
6. Implement toast notifications (replace alerts)

## File Structure Summary

```
app/
├── core/              # Core functionality (services, constants)
├── shared/            # Shared components
├── features/          # Feature modules (independent)
├── layout/            # Layout components
└── config/            # Configuration files
```

Each feature module is self-contained and can be added/removed independently!

