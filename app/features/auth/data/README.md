# Mock Users Data

This file contains JSON mock data for user authentication with different roles for development and testing purposes.

## Available Test Users

### 1. Admin User
- **Email:** `admin@synkup.com`
- **Password:** `admin123`
- **Role:** ADMIN
- **Roles:** ['ADMIN', 'SUPER_ADMIN']
- **Permissions:** ['*'] (All permissions)

### 2. Super Admin
- **Email:** `superadmin@synkup.com`
- **Password:** `superadmin123`
- **Role:** SUPER_ADMIN
- **Roles:** ['SUPER_ADMIN', 'ADMIN']
- **Permissions:** ['*'] (All permissions)

### 3. Campus Admin
- **Email:** `campus@synkup.com`
- **Password:** `campus123`
- **Role:** CAMPUS_ADMIN
- **Roles:** ['CAMPUS_ADMIN']
- **Permissions:** ['campus:read', 'campus:write', 'student:read', 'student:write']

### 4. Company Admin
- **Email:** `company@synkup.com`
- **Password:** `company123`
- **Role:** COMPANY
- **Roles:** ['COMPANY']
- **Permissions:** ['company:read', 'company:write', 'job:read', 'job:write']

### 5. Student User
- **Email:** `student@synkup.com`
- **Password:** `student123`
- **Role:** STUDENT
- **Roles:** ['STUDENT']
- **Permissions:** ['student:read', 'profile:read', 'profile:write']

### 6. Regular User
- **Email:** `user@synkup.com`
- **Password:** `user123`
- **Role:** USER
- **Roles:** ['USER']
- **Permissions:** ['profile:read']

## Usage

The mock data is automatically loaded when the application starts. Simply use any of the email/password combinations above to log in.

## Cache Clearing

The application is configured to clear authentication cache on every server restart (development mode). This ensures a clean state for testing.

To disable cache clearing in production, set `CLEAR_CACHE_ON_START: false` in `app/core/constants/app.constants.js`.

