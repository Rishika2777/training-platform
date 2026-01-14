# Campus ID Auto-Injection Implementation Guide

## 📋 Overview

This document describes the implementation of automatic campus ID injection in the `CampusApiService`. The changes ensure that all API calls automatically use the logged-in campus ID from storage, eliminating the need to manually pass campus ID in most cases.

**Feature Branch:** `feature-campus-campusid`

**Main File Modified:** `src/app/features/campus/services/campus-api.service.ts`

---

## 🎯 Core Changes

### 1. Campus ID Helper Method

A new private method `getCampusId()` was added to automatically retrieve campus ID from storage if not explicitly provided.

**Location:** Lines 19-31 in `campus-api.service.ts`

```typescript
/**
 * Get campus ID from storage if not provided.
 * This ensures all API calls are filtered by the logged-in campus.
 */
private getCampusId(providedCampusId?: string): string | undefined {
  // If campus ID is explicitly provided, use it (for admin or special cases)
  if (providedCampusId) {
    return providedCampusId;
  }
  // Otherwise, get from storage (set during login)
  const storedCampusId = this.storage.get(STORAGE_KEYS.CAMPUS_ID);
  return storedCampusId || undefined;
}
```

**Key Points:**
- If `providedCampusId` is passed, it takes priority (useful for admin operations)
- Otherwise, retrieves from `STORAGE_KEYS.CAMPUS_ID` in storage
- Returns `undefined` if no campus ID is found

---

## 📝 Methods Updated with Auto Campus ID Injection

The following methods were updated to automatically inject campus ID from storage:

### 2. Placed Students Methods

#### `addPlacedStudent()`
- **Lines:** 173-220
- **Change:** Added automatic campus ID injection
- **Pattern:**
```typescript
addPlacedStudent(formData: FormData, campusId?: string): Observable<AddPlacedStudentResponse | null> {
  const finalCampusId = this.getCampusId(campusId);
  if (!finalCampusId) {
    return throwError(() => new Error('Campus ID is required to add placed student'));
  }
  const url = this.buildUrl(API_ENDPOINTS.CAMPUS.ADD_PLACED_STUDENT, { campusId: finalCampusId });
  // ... rest of implementation
}
```

#### `getPlacedStudents()`
- **Lines:** 228-305
- **Change:** Added automatic campus ID injection with pagination support
- **Pattern:** Similar to above, uses `finalCampusId` in URL building

---

### 3. Company Visited Methods

#### `addCompanyVisited()`
- **Lines:** ~360-430
- **Change:** Campus ID added as query parameter if available
- **Pattern:**
```typescript
const finalCampusId = this.getCampusId(campusId);
if (finalCampusId) {
  params = params.set('campusId', finalCampusId);
}
```

#### `getCompaniesVisited()`
- **Lines:** ~460-615
- **Change:** Campus ID added as query parameter if available

---

### 4. Course Management Methods

#### `addCourse()`
- **Lines:** 624-682
- **Change:** Automatic campus ID injection + ensures campusId in response data
- **Special:** Adds campusId to response if backend doesn't return it

#### `getAllCourses()`
- **Lines:** 690-730
- **Change:** Automatic campus ID injection

#### `getCourseById()`
- **Lines:** 749-790
- **Change:** Automatic campus ID injection

#### `checkCourseNameExists()`
- **Lines:** 810-850
- **Change:** Automatic campus ID injection

#### `deleteCourse()`
- **Lines:** 870-910
- **Change:** Automatic campus ID injection

---

### 5. Faculty Management Methods

#### `addFaculty()`
- **Lines:** 951-1010
- **Change:** Automatic campus ID injection

#### `updateFaculty()`
- **Lines:** 1056-1145
- **Change:** Automatic campus ID injection with enhanced error handling

#### `getAllFaculties()`
- **Lines:** 1156-1200
- **Change:** Automatic campus ID injection

#### `getFacultyById()`
- **Lines:** 1222-1280
- **Change:** Automatic campus ID injection

#### `getFacultyProfile()`
- **Lines:** 1298-1355
- **Change:** Automatic campus ID injection

#### `deleteFaculty()`
- **Lines:** 1375-1415
- **Change:** Automatic campus ID injection

#### `checkFacultyEmail()`
- **Lines:** 1439-1475
- **Change:** Automatic campus ID injection

---

### 6. Alumni Methods

#### `getAlumniForCarousel()`
- **Lines:** ~1646
- **Change:** Campus ID added as query parameter if available

#### `getAlumniForDashboard()`
- **Lines:** ~1683
- **Change:** Campus ID added as query parameter if available

---

### 7. Announcements Methods

#### `getAnnouncements()`
- **Lines:** 1717-1739
- **Change:** Campus ID added as query parameter if available

---

### 8. Prospectus Methods

#### `getProspectusById()`
- **Lines:** ~1946
- **Change:** Automatic campus ID injection

#### `deleteProspectus()`
- **Lines:** ~2074
- **Change:** Automatic campus ID injection

---

## 🔧 Dependencies Required

### Storage Service
The implementation uses `StorageService` which must be injected:

```typescript
private readonly storage = inject(StorageService);
```

### Storage Keys Constant
The `STORAGE_KEYS` constant must include `CAMPUS_ID`:

```typescript
export const STORAGE_KEYS = {
  // ... other keys
  CAMPUS_ID: 'crm_campus_id',
  // ... other keys
} as const;
```

**Location:** `src/app/core/config/app.constants.ts` (Line 84)

### Import Statements
Ensure these imports are present:

```typescript
import { STORAGE_KEYS } from '../../../core/config/app.constants';
import { StorageService } from '../../../core/storage/storage.service';
```

---

## 📋 Implementation Pattern

For each method that needs campus ID auto-injection, follow this pattern:

### Pattern 1: Required Campus ID (Most Common)

```typescript
methodName(params, campusId?: string): Observable<ResponseType> {
  // Automatically inject campus ID from storage if not provided
  const finalCampusId = this.getCampusId(campusId);
  if (!finalCampusId) {
    console.error('CampusApiService: methodName - Campus ID is required');
    return throwError(() => new Error('Campus ID is required'));
  }
  
  const url = this.buildUrl(API_ENDPOINTS.CAMPUS.ENDPOINT, { campusId: finalCampusId });
  // ... rest of implementation using finalCampusId
}
```

### Pattern 2: Optional Campus ID (Query Parameter)

```typescript
methodName(params, campusId?: string): Observable<ResponseType> {
  const url = this.buildUrl(API_ENDPOINTS.CAMPUS.ENDPOINT);
  const finalCampusId = this.getCampusId(campusId);
  let params = new HttpParams();
  if (finalCampusId) {
    params = params.set('campusId', finalCampusId);
  }
  // ... rest of implementation
}
```

---

## 🐛 Debugging & Logging

Extensive console logging was added for debugging:

### Logging Pattern
```typescript
console.log('CampusApiService: methodName - URL:', url);
console.log('CampusApiService: methodName - Campus ID:', finalCampusId);
console.log('CampusApiService: methodName - Raw response:', raw);
console.log('CampusApiService: methodName - Parsed response:', response);
```

### Error Logging
```typescript
console.error('CampusApiService: methodName - Error occurred:', error);
console.error('CampusApiService: methodName - Error status:', error?.status);
console.error('CampusApiService: methodName - Error URL:', error?.url);
console.error('CampusApiService: methodName - Error response:', error?.error);
```

**Note:** These console logs can be removed in production or replaced with a proper logging service.

---

## ✅ Additional Changes

### Public Campus Endpoint

#### `getPublicCampusById()`
- **Lines:** 84-122
- **New Method:** Handles public landing endpoint for campus details
- **Response Format:** `{ message: null, data: { id, campusId, email, campusName, ... } }`
- **Features:**
  - Handles both wrapped (`{ data: {...} }`) and unwrapped response formats
  - Comprehensive error handling
  - Detailed logging

---

## 🚀 Implementation Steps

To implement these changes in another project:

1. **Add the `getCampusId()` helper method** to `CampusApiService`
   - Copy lines 19-31 from the implementation

2. **Update each method** that requires campus ID:
   - Add `campusId?: string` parameter (if not already present)
   - Call `getCampusId(campusId)` at the start
   - Use `finalCampusId` instead of `campusId` in URL building
   - Add error handling if campus ID is required

3. **Ensure dependencies are available:**
   - `StorageService` is injected
   - `STORAGE_KEYS.CAMPUS_ID` is defined
   - Imports are correct

4. **Test each updated method:**
   - With campus ID in storage (automatic)
   - With explicit campus ID parameter (override)
   - Without campus ID (should error gracefully)

5. **Remove or replace console.log statements** for production

---

## 📊 Statistics

- **Total Methods Updated:** ~25 methods
- **Lines of Code Added:** ~500+ lines
- **Console Log Statements:** ~200+ (for debugging)
- **Error Handling Improvements:** All methods now have comprehensive error handling

---

## 🔍 Key Benefits

1. **Automatic Campus Filtering:** All API calls automatically use the logged-in campus ID
2. **Reduced Boilerplate:** No need to manually pass campus ID in most cases
3. **Admin Override:** Explicit campus ID parameter allows admin operations
4. **Better Error Handling:** Comprehensive error logging and handling
5. **Consistent Pattern:** All methods follow the same pattern for maintainability

---

## ⚠️ Important Notes

1. **Storage Requirement:** Campus ID must be stored in `STORAGE_KEYS.CAMPUS_ID` during login
2. **Error Handling:** Methods that require campus ID will throw an error if not found
3. **Admin Operations:** Pass explicit campus ID parameter to override storage value
4. **Console Logs:** Consider removing or replacing with proper logging service in production
5. **Backward Compatibility:** All methods maintain backward compatibility with optional `campusId` parameter

---

## 🧪 Testing Checklist

- [ ] Test with campus ID in storage (automatic injection)
- [ ] Test with explicit campus ID parameter (override)
- [ ] Test without campus ID (should error gracefully)
- [ ] Test admin operations with different campus ID
- [ ] Verify all API calls include correct campus ID
- [ ] Check error messages are user-friendly
- [ ] Verify response parsing works correctly
- [ ] Test pagination with campus ID filtering

---

## 📞 Support

If you encounter any issues during implementation:

1. Check that `STORAGE_KEYS.CAMPUS_ID` is properly set during login
2. Verify `StorageService` is properly injected
3. Check browser console for detailed error logs
4. Ensure all imports are correct
5. Verify API endpoints match the expected format

---

**Last Updated:** Based on implementation in `feature-campus-campusid` branch
**File:** `src/app/features/campus/services/campus-api.service.ts`
