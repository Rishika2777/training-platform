# Dummy Authentication Implementation

## Overview

The application currently uses **dummy authentication** for development purposes until the backend API is ready. This allows you to test the application flow without a real backend.

## How It Works

### Current Implementation (Dummy)

The `AuthService` in `app/features/auth/services/auth.service.js` has dummy implementations that:
- Accept any email/password combination
- Create a dummy user with ADMIN role
- Store authentication token in localStorage
- Simulate API delay (500ms)

### Authentication Flow

1. **Root Route (`/`)**: 
   - Checks if user is logged in
   - If logged in → Redirects to dashboard
   - If not logged in → Shows login landing page

2. **Login**:
   - User enters email/password
   - AuthService validates (currently accepts any input)
   - Creates dummy user data
   - Stores token and user data
   - Redirects to dashboard

3. **Logout**:
   - Clears token and user data from localStorage
   - Redirects to landing page

## Where to Implement Real API

### File: `app/features/auth/services/auth.service.js`

#### 1. Login Function (Line ~13)

**Current (Dummy):**
```javascript
this.login = function(credentials) {
    // DUMMY IMPLEMENTATION - FOR DEVELOPMENT ONLY
    return new Promise(function(resolve, reject) {
        // ... dummy code ...
    });
}
```

**When Backend is Ready:**
```javascript
this.login = function(credentials) {
    // Remove dummy code above
    // Uncomment the real API call below:
    return ApiService.post(API_ENDPOINTS.AUTH.LOGIN, credentials)
        .then(function(response) {
            if (response.token) {
                StorageService.set(STORAGE_KEYS.AUTH_TOKEN, response.token);
                StorageService.set(STORAGE_KEYS.USER_DATA, response.user);
            }
            return response;
        })
        .catch(function(error) {
            return ErrorHandlerService.handleApiError(error);
        });
}
```

#### 2. Register Function (Line ~30)

**Current (Dummy):**
```javascript
this.register = function(userData) {
    // DUMMY IMPLEMENTATION - FOR DEVELOPMENT ONLY
    return new Promise(function(resolve, reject) {
        // ... dummy code ...
    });
}
```

**When Backend is Ready:**
```javascript
this.register = function(userData) {
    // Remove dummy code above
    // Uncomment the real API call below:
    return ApiService.post(API_ENDPOINTS.AUTH.REGISTER, userData)
        .then(function(response) {
            return response;
        })
        .catch(function(error) {
            return ErrorHandlerService.handleApiError(error);
        });
}
```

#### 3. Logout Function (Line ~43)

**Current (Dummy):**
```javascript
this.logout = function() {
    // DUMMY IMPLEMENTATION - FOR DEVELOPMENT ONLY
    StorageService.remove(STORAGE_KEYS.AUTH_TOKEN);
    // ... dummy code ...
}
```

**When Backend is Ready:**
```javascript
this.logout = function() {
    // Remove dummy code above
    // Uncomment the real API call below:
    return ApiService.post(API_ENDPOINTS.AUTH.LOGOUT)
        .finally(function() {
            StorageService.remove(STORAGE_KEYS.AUTH_TOKEN);
            StorageService.remove(STORAGE_KEYS.REFRESH_TOKEN);
            StorageService.remove(STORAGE_KEYS.USER_DATA);
        });
}
```

## Testing with Dummy Auth

### Test Login
1. Go to `http://localhost:8080`
2. Click "Sign In"
3. Enter any email and password
4. Click "Sign In"
5. You'll be logged in as ADMIN and redirected to dashboard

### Test Different Roles

To test different roles, modify the dummy user in `auth.service.js`:

```javascript
// Change this line in login function:
role: 'ADMIN', // Change to 'STUDENT', 'COMPANY', 'CAMPUS_ADMIN', etc.
roles: ['ADMIN'] // Change array to test different role combinations
```

### Test Logout
1. Click logout (when implemented in header)
2. Or clear localStorage: `localStorage.clear()` in browser console
3. Refresh page - should show landing page

## API Response Format Expected

When implementing real API, ensure responses match this format:

### Login Response
```json
{
    "success": true,
    "token": "jwt_token_here",
    "user": {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com",
        "role": "ADMIN",
        "roles": ["ADMIN"]
    }
}
```

### Register Response
```json
{
    "success": true,
    "message": "Registration successful",
    "user": {
        "id": 1,
        "email": "user@example.com",
        "name": "User Name"
    }
}
```

## Migration Steps

1. **Update API Base URL** in `app/core/constants/app.constants.js`:
   ```javascript
   API_BASE_URL: 'http://your-backend-url:port/api'
   ```

2. **Remove Dummy Code** from `auth.service.js`:
   - Remove all dummy implementations
   - Uncomment real API calls
   - Remove TODO comments

3. **Test Real API**:
   - Test login with real credentials
   - Test register with real data
   - Test logout
   - Verify token storage
   - Verify user data structure

4. **Update Error Handling**:
   - Ensure error messages are user-friendly
   - Test error scenarios (invalid credentials, network errors)

## Notes

- ✅ Dummy auth works with any email/password
- ✅ User data is stored in localStorage
- ✅ Token is stored in localStorage
- ✅ Role-based access control works with dummy data
- ✅ Menu filtering works with dummy roles
- ⚠️ All data is lost on page refresh (localStorage persists)
- ⚠️ No real validation or security

## Security Reminder

⚠️ **Important**: Dummy authentication has **NO security**. It's for development only. Always implement real authentication before production deployment.

---

**When backend API is ready, simply uncomment the real API calls and remove the dummy code!**

