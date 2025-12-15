# CRM Application Architecture

## Overview
This is a modular, enterprise-grade CRM application built with AngularJS following best practices for scalability and maintainability.

## Project Structure

```
app/
├── core/                    # Core application functionality
│   ├── constants/          # Application constants and configuration
│   ├── services/           # Core services (API, Storage, Error Handler, Menu)
│   ├── interceptors/       # HTTP interceptors
│   └── run/                # App initialization
│
├── shared/                  # Shared components and utilities
│   ├── components/         # Reusable UI components (Button, Input, Footer)
│   ├── css/                # Shared styles and theme
│   └── directives/         # Shared directives
│
├── features/               # Feature modules (Independent modules)
│   ├── auth/               # Authentication module
│   │   ├── services/       # Auth-specific services
│   │   └── views/          # Auth views
│   ├── dashboard/          # Dashboard module
│   ├── campus/             # Campus management module
│   └── courses/            # Courses management module
│
├── layout/                  # Layout components
│   ├── header/             # Header component
│   ├── sidebar/            # Sidebar with dynamic menu
│   └── layout.html         # Main layout template
│
└── config/                  # Configuration files
    └── routes.config.js     # Route configuration
```

## Key Features

### 1. Modular Architecture
- Each feature is an independent module
- Modules can be added/removed without breaking existing code
- Each module registers its own menu items

### 2. Dynamic Menu System
- Menu items are registered by modules independently
- Menu configuration is stored and can be updated dynamically
- New modules automatically appear in the menu

### 3. API Service Layer
- Centralized API service for all HTTP requests
- Swagger API integration ready
- Automatic token injection
- Error handling

### 4. Theme System
- CSS variables for consistent theming
- Easy to customize colors, spacing, fonts
- Shared utility classes

### 5. Reusable Components
- Button, Input, Footer components
- Can be extended with more components

## Adding a New Module

### Step 1: Create Module Structure
```
app/features/your-module/
├── your-module.module.js
├── services/
│   └── your-module.service.js
└── views/
    └── your-module.html
```

### Step 2: Create Module File
```javascript
// app/features/your-module/your-module.module.js
angular.module('campusApp.yourModule', [])
    .config(['MenuService', function(MenuService) {
        // Register menu item
        MenuService.registerMenuItem({
            id: 'your-module',
            label: 'Your Module',
            icon: 'fa-icon',
            route: '/your-module',
            order: 10,
            module: 'yourModule'
        });
    }]);
```

### Step 3: Create Service (if needed)
```javascript
// app/features/your-module/services/your-module.service.js
angular.module('campusApp.yourModule')
    .service('YourModuleService', ['ApiService', 'ErrorHandlerService', 'API_ENDPOINTS', 
        function(ApiService, ErrorHandlerService, API_ENDPOINTS) {
            // Your service methods
        }]);
```

### Step 4: Register Module in app.module.js
```javascript
var app = angular.module("campusApp", [
    "ngRoute",
    "campusApp.yourModule"  // Add your module here
]);
```

### Step 5: Add Routes
```javascript
// In app/config/routes.config.js
$routeProvider.when("/your-module", {
    templateUrl: "app/features/your-module/views/your-module.html",
    controller: "YourModuleController",
    requiresAuth: true
});
```

## API Integration

### Using API Service
```javascript
// In your service
angular.module('campusApp.yourModule')
    .service('YourService', ['ApiService', 'API_ENDPOINTS', function(ApiService, API_ENDPOINTS) {
        this.getData = function() {
            return ApiService.get(API_ENDPOINTS.YOUR_MODULE.LIST);
        };
        
        this.create = function(data) {
            return ApiService.post(API_ENDPOINTS.YOUR_MODULE.CREATE, data);
        };
    }]);
```

### Adding API Endpoints
```javascript
// In app/core/constants/app.constants.js
.constant('API_ENDPOINTS', {
    YOUR_MODULE: {
        BASE: '/your-module',
        LIST: '/your-module',
        CREATE: '/your-module',
        UPDATE: '/your-module/:id',
        DELETE: '/your-module/:id'
    }
});
```

## Menu System

### Registering Menu Items
Each module registers its menu items in its module config:

```javascript
MenuService.registerMenuItem({
    id: 'unique-id',
    label: 'Menu Label',
    icon: 'fa-icon-class',
    route: '/route-path',
    order: 5,  // Lower numbers appear first
    module: 'moduleName'
});
```

### Removing Menu Items
```javascript
MenuService.unregisterMenuItem('menu-id');
```

## Theme Customization

Edit `app/shared/css/theme.css` to customize:
- Colors (Primary, Secondary, Status colors)
- Spacing
- Border Radius
- Font Sizes
- Shadows

## Best Practices

1. **Module Independence**: Each module should be self-contained
2. **Service Layer**: Business logic goes in services, not controllers
3. **Error Handling**: Always use ErrorHandlerService
4. **API Calls**: Always use ApiService, never $http directly
5. **Constants**: Use constants for configuration values
6. **Reusable Components**: Use shared components when possible

## Backend Integration

### Swagger API Setup
1. Update `APP_CONFIG.API_BASE_URL` in `app/core/constants/app.constants.js`
2. Update `API_ENDPOINTS` to match your Swagger API endpoints
3. The API service automatically handles authentication tokens

### MongoDB Integration
- Backend handles MongoDB operations
- Frontend only makes HTTP requests to API endpoints
- API service handles request/response transformation

## Development Workflow

1. Create feature module
2. Register module in app.module.js
3. Add routes in routes.config.js
4. Register menu items in module config
5. Create services for business logic
6. Create views and controllers
7. Test independently

## File Loading Order

Update `index.html` to load files in this order:
1. Core constants
2. Core services
3. Core interceptors
4. Shared components
5. Feature modules
6. Routes config
7. App run block

