# Quick Implementation Guide - Campus ID Auto-Injection

## 🚀 Quick Start

### Step 1: Add Helper Method

Add this method to your `CampusApiService` class:

```typescript
/**
 * Get campus ID from storage if not provided.
 * This ensures all API calls are filtered by the logged-in campus.
 */
private getCampusId(providedCampusId?: string): string | undefined {
  if (providedCampusId) {
    return providedCampusId;
  }
  const storedCampusId = this.storage.get(STORAGE_KEYS.CAMPUS_ID);
  return storedCampusId || undefined;
}
```

### Step 2: Update Methods

For each method that needs campus ID, use this pattern:

```typescript
methodName(params, campusId?: string): Observable<ResponseType> {
  const finalCampusId = this.getCampusId(campusId);
  if (!finalCampusId) {
    return throwError(() => new Error('Campus ID is required'));
  }
  const url = this.buildUrl(API_ENDPOINTS.CAMPUS.ENDPOINT, { campusId: finalCampusId });
  // Use finalCampusId instead of campusId
}
```

---

## 📋 Methods to Update

### Required Campus ID (URL Parameter)
- `addPlacedStudent()`
- `getPlacedStudents()`
- `addCourse()`
- `getAllCourses()`
- `getCourseById()`
- `checkCourseNameExists()`
- `deleteCourse()`
- `addFaculty()`
- `updateFaculty()`
- `getAllFaculties()`
- `getFacultyById()`
- `getFacultyProfile()`
- `deleteFaculty()`
- `checkFacultyEmail()`
- `getProspectusById()`
- `deleteProspectus()`

### Optional Campus ID (Query Parameter)
- `addCompanyVisited()`
- `getCompaniesVisited()`
- `getAlumniForCarousel()`
- `getAlumniForDashboard()`
- `getAnnouncements()`

---

## ✅ Checklist

- [ ] Add `getCampusId()` helper method
- [ ] Inject `StorageService` (if not already)
- [ ] Ensure `STORAGE_KEYS.CAMPUS_ID` exists in constants
- [ ] Update all methods listed above
- [ ] Test with campus ID in storage
- [ ] Test with explicit campus ID parameter
- [ ] Test error handling when campus ID is missing

---

## 🔑 Key Points

1. **Priority:** Explicit parameter > Storage value
2. **Error Handling:** Throw error if campus ID is required but missing
3. **Storage Key:** Must be `STORAGE_KEYS.CAMPUS_ID`
4. **Pattern:** Always use `finalCampusId` variable name for consistency

---

## 📝 Example Implementation

**Before:**
```typescript
addCourse(request: AddCourseRequest, campusId: string): Observable<AddCourseResponse> {
  const url = this.buildUrl(API_ENDPOINTS.CAMPUS.ADD_COURSE, { campusId });
  return this.http.post(url, request);
}
```

**After:**
```typescript
addCourse(request: AddCourseRequest, campusId?: string): Observable<AddCourseResponse> {
  const finalCampusId = this.getCampusId(campusId);
  if (!finalCampusId) {
    return throwError(() => new Error('Campus ID is required to add a course'));
  }
  const url = this.buildUrl(API_ENDPOINTS.CAMPUS.ADD_COURSE, { campusId: finalCampusId });
  return this.http.post(url, request);
}
```

---

**See `CAMPUS_ID_IMPLEMENTATION.md` for detailed documentation.**
