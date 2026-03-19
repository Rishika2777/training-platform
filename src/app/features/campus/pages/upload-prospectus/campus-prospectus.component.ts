import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, inject, Input, OnChanges, OnDestroy, OnInit, Output, PLATFORM_ID, signal, computed, SimpleChanges, ViewChild } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { InputWithFileComponent } from '../../../../shared/components/input-with-file/input-with-file.component';
import { DropdownComponent } from '../../../../shared/components/dropdown/dropdown.component';
import { CampusApiService, ProspectusData, AddCourseResponseData, Campus } from '../../services/campus-api.service';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { StorageService } from '../../../../core/storage/storage.service';
import { STORAGE_KEYS } from '../../../../core/config/app.constants';
import { unwrapApiResponse } from '../../../../core/api/api-response.utils';
import { AuthStateService } from '../../../../core/auth/auth-state.service';

export interface ProspectusUploadFormValue {
  campus: string;
  campusFile: File | null;
  course: string;
  courseFile: File | null;
  department?: string;
}

@Component({
  selector: 'app-campus-prospectus',
  standalone: true,
  imports: [CommonModule, ButtonComponent, InputWithFileComponent, DropdownComponent],
  templateUrl: './campus-prospectus.component.html',
  styleUrl: './campus-prospectus.component.css',
})
export class CampusProspectusComponent implements OnInit, OnChanges, OnDestroy {
  private readonly campusApi = inject(CampusApiService);
  private readonly notify = inject(NotificationService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId as object);
  private readonly storage = inject(StorageService);
  private readonly authState = inject(AuthStateService);
  
  // Event handler for courseAdded event
  private courseAddedHandler: (() => void) | null = null;

  @Input() submitting = false;
  @Input() value: ProspectusUploadFormValue = {
    campus: '',
    campusFile: null,
    course: '',
    courseFile: null,
    department: '', 
  };
  @Input() showDepartment = true;


  @Output() valueChange = new EventEmitter<ProspectusUploadFormValue>();
  @Output() submitted = new EventEmitter<ProspectusUploadFormValue>();
  @Output() uploadSuccess = new EventEmitter<void>();
  @Output() deleteRequested = new EventEmitter<{ id: string; name: string; departmentId?: string }>();


  // ---------------- department section ---------
 departmentItems: { label: string; value: string }[] = [];
loadingDepartments = signal(false);


  // Prospectus management state
  readonly prospectusList = signal<readonly ProspectusData[]>([]);
  loadingProspectus = signal(false);
  
  // Store actual campus ID separately (for API)
  private actualCampusId = '';

  // Map to store original file names by prospectus ID
  // Key: prospectus ID, Value: original file name
  private readonly prospectusFileNameMap = new Map<string, string>();

  // Temporary storage for the last uploaded file name (before mapping to prospectus ID)
  private _lastUploadedFileName: string | null = null;

  @ViewChild('prospectusFileInput') prospectusFileInputComponent?: InputWithFileComponent;

  /**
   * Reset form to initial empty state
   * Called when modal opens or after successful submission
   */
  resetForm(): void {
    console.log('CampusProspectusComponent: resetForm() called - Starting reset');
    
    // STEP 1: Clear actualCampusId FIRST to ensure displayCampusValue() shows empty
    this.actualCampusId = '';
    
    // STEP 2: Reset form values - create completely new object to ensure Angular detects the change
    this.value = {
      campus: '',
      campusFile: null,
      course: '',
      courseFile: null,
      department: '',
    };
    
    // STEP 3: Clear prospectus list and file name map to ensure fresh state
    this.prospectusList.set([]);
    this.prospectusFileNameMap.clear();
    this._lastUploadedFileName = null;
    
    // STEP 4: Emit the reset value to parent component immediately
    this.valueChange.emit(this.value);
    
    // STEP 5: Clear file input component's internal file state
    // Use multiple attempts to ensure it's cleared
    setTimeout(() => {
      if (this.prospectusFileInputComponent) {
        console.log('CampusProspectusComponent: Clearing file input component');
        // Clear the file input element
        if (this.prospectusFileInputComponent.fileInputRef?.nativeElement) {
          this.prospectusFileInputComponent.fileInputRef.nativeElement.value = '';
        }
        // Use the clearFile method to clear internal selectedFile state
        this.prospectusFileInputComponent.clearFile();
      }
    }, 0);
    
    // STEP 6: Force change detection to update the view
    this.cdr.detectChanges();
    
    // STEP 7: Additional cleanup after a short delay to ensure everything is cleared
    setTimeout(() => {
      // Double-check that values are cleared
      if (this.value.course || this.value.campus) {
        console.warn('CampusProspectusComponent: Values still present after reset, forcing clear');
        this.value = {
          campus: '',
          campusFile: null,
          course: '',
          courseFile: null,
        };
        this.valueChange.emit(this.value);
        this.cdr.detectChanges();
      }
      
      // Double-check file input
      if (this.prospectusFileInputComponent) {
        if (this.prospectusFileInputComponent.fileInputRef?.nativeElement) {
          this.prospectusFileInputComponent.fileInputRef.nativeElement.value = '';
        }
        this.prospectusFileInputComponent.clearFile();
      }
    }, 50);
    
    console.log('CampusProspectusComponent: Form reset completed', {
      value: this.value,
      actualCampusId: this.actualCampusId,
      prospectusListLength: this.prospectusList().length,
      displayCampusValue: this.displayCampusValue(),
      courseValue: this.value.course
    });
  }

  /**
   * Get campus ID from storage or auth state
   * Priority: Auth state > Storage
   */
  private getCampusIdFromStorage(): string | null {
    if (!this.isBrowser) {
      return null;
    }
    
    // Try from auth state (user profile) - profileServiceId contains campusId
    const currentUser = this.authState.user();
    const campusIdFromUser = currentUser?.profileServiceId || currentUser?.campusId;
    if (campusIdFromUser) {
      return campusIdFromUser;
    }
    
    // Try from storage
    const campusIdFromStorage = this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null;
    if (campusIdFromStorage) {
      return campusIdFromStorage;
    }
    
    return null;
  }

  /**
   * Check if a string is a valid ID (MongoDB ObjectId or numeric ID, not a file name)
   */
  private isValidId(value: string): boolean {
    if (!value || !value.trim()) return false;
    const trimmed = value.trim();
    
    // If it contains a dot followed by letters (file extension), it's likely a file name
    if (/\.\w+$/.test(trimmed)) {
      return false;
    }
    
    // MongoDB ObjectId: 24-character hex string (e.g., "6953551e7d3a6f34ef390225")
    if (/^[0-9a-fA-F]{24}$/.test(trimmed)) {
      return true;
    }
    
    // Numeric ID (legacy support)
    if (/^\d+$/.test(trimmed)) {
      return true;
    }
    
    return false;
  }

  // Course items - loaded from API (GET /courses)
  // API returns: { success: true, data: AddCourseResponseData[], error: null }
  readonly courseItems = signal<readonly { label: string; value: string }[]>([]);
  // Store actual course objects for validation
  private loadedCourses = signal<readonly AddCourseResponseData[]>([]);
  loadingCourses = signal(false);

  // Store actual campus objects for getting campus name
  private loadedCampuses = signal<readonly Campus[]>([]);

  // Computed signal to get display value for campus field (show name instead of ID)
  // NOTE: Returns empty string to keep field empty as per client requirement
  readonly displayCampusValue = computed(() => {
    // Always return empty string to keep the field empty
    // actualCampusId is stored internally for API calls but not displayed in the field
    return '';
  });

  ngOnInit(): void {
    // Load campuses (for getting campus names) and courses from API
    this.loadCampuses();
    this.loadCourses();
    this.loadDepartments();

    
    // Load all prospectuses by campus on initialization (without requiring course selection)
    // This ensures the list is shown by default when modal opens
    const campusId = this.getCampusIdFromStorage();
    if (campusId && this.isValidId(campusId)) {
      // Store campus ID internally but don't populate form fields
      this.actualCampusId = campusId;
      // Load all prospectuses for this campus
      setTimeout(() => {
        this.getProspectusByCampus(campusId);
      }, 100);
    }
    
    // Listen for courseAdded event to refresh courses list (only in browser)
    if (this.isBrowser) {
      this.courseAddedHandler = () => {
        console.log('CampusProspectusComponent: Received courseAdded event, refreshing courses list...');
        this.loadCourses();
      };
      window.addEventListener('courseAdded', this.courseAddedHandler);
      console.log('CampusProspectusComponent: Registered courseAdded event listener');
    }
  }

  // --------------- department -----------

  private loadDepartments(): void {
  const campusId = this.getCampusIdFromStorage();

  if (!campusId) return;

  this.loadingDepartments.set(true);

  this.campusApi.getAllDepartmentsByCampus(campusId).subscribe({
    next: (res) => {
      this.loadingDepartments.set(false);

      if (res?.success && res.data) {
        this.departmentItems = res.data.map((dept: { id: string; departmentName: string }) => ({

          label: dept.departmentName,
          value: dept.id
        }));
      } else {
        this.departmentItems = [];
      }
    },
    error: () => {
      this.loadingDepartments.set(false);
      this.departmentItems = [];
    }
  });
}


  ngOnDestroy(): void {
    // Remove event listener when component is destroyed (only in browser)
    if (this.isBrowser && this.courseAddedHandler) {
      window.removeEventListener('courseAdded', this.courseAddedHandler);
      this.courseAddedHandler = null;
    }
  }

  /**
   * Load campuses from API (for getting campus names to display)
   * GET /campus/getAll
   */
  loadCampuses(): void {
    this.campusApi.getAllCampuses().subscribe({
      next: (campuses) => {
        // Store actual campus objects for getting campus names
        this.loadedCampuses.set(campuses);
        
        // If we have a campus ID in the form, try to find and set it
        if (this.value.campus.trim() && this.isValidId(this.value.campus.trim())) {
          const existingCampus = campuses.find(c => 
            (c.id && c.id.trim() === this.value.campus.trim()) || 
            (c.campusId && c.campusId.trim() === this.value.campus.trim())
          );
          if (existingCampus) {
            this.actualCampusId = existingCampus.campusId?.trim() || existingCampus.id?.trim() || this.value.campus.trim();
          }
        }
      },
      error: () => {
        this.loadedCampuses.set([]);
        // Don't show error for campus loading as it's only for display names
      },
    });
  }

  /**
   * Load courses from API
   * GET /courses
   * Response: { success: true, data: AddCourseResponseData[], error: null }
   * 
   * IMPORTANT: Courses are loaded from GET /courses endpoint which returns all courses with full details.
   * This ensures newly added courses appear in the dropdown.
   */
  loadCourses(): void {
    this.loadingCourses.set(true);
    
    this.campusApi.getAllCourses().subscribe({
      next: (courses) => {
        // Store actual course objects for validation
        this.loadedCourses.set(courses);
        
        // Convert course objects to dropdown items format: { label: string, value: string }
        // API returns: [{ id, courseName, duration, totalSeats, ... }, ...]
        const courseDropdownItems = courses
          .filter(course => course && course.courseName && typeof course.courseName === 'string' && course.courseName.trim() !== '')
          .map(course => ({
            label: course.courseName!.trim(),
            value: course.courseName!.trim(), // Use courseName as both label and value
          }));
        
        if (courseDropdownItems.length > 0) {
          this.courseItems.set(courseDropdownItems);
        } else {
          this.courseItems.set([]);
        }
        
        this.loadingCourses.set(false);
      },
      error: () => {
        this.courseItems.set([]);
        this.loadedCourses.set([]);
        this.loadingCourses.set(false);
        // Do not show toast on public campus profile (no campus context, API may fail)
      },
    });
  }

  /**
   * Public method to reload courses.
   * Can be called when modal opens to ensure fresh data.
   */
  reloadCourses(): void {
    this.loadCourses();
  }

  /**
   * Public method to refresh prospectus list.
   * Can be called after successful upload to show the new prospectus.
   * Optionally accepts campusId and courseName to ensure list loads correctly.
   * NOTE: This method does NOT populate form fields - it only loads the prospectus list.
   */
  refreshProspectusList(campusId?: string, courseName?: string): void {
    console.log('CampusProspectusComponent: refreshProspectusList called', { campusId, courseName });
    
    // If campusId is provided, store it internally but DON'T update form value
    // This ensures fields remain empty while list is loaded
    if (campusId && this.isValidId(campusId)) {
      this.actualCampusId = campusId.trim();
    }
    
    // If we have both campusId and courseName, load directly (more reliable)
    if (campusId && this.isValidId(campusId) && courseName && courseName.trim()) {
      console.log('CampusProspectusComponent: Loading prospectus directly with provided campusId and courseName');
      setTimeout(() => {
        this.getProspectusByCourse(courseName.trim(), campusId.trim());
      }, 100);
      return;
    }
    
    // If we have campusId but no courseName, load by campus directly (shows all prospectuses)
    if (campusId && this.isValidId(campusId)) {
      console.log('CampusProspectusComponent: Loading prospectus directly with provided campusId (no course)');
      setTimeout(() => {
        this.getProspectusByCampus(campusId.trim());
      }, 100);
      return;
    }
    
    // If no campusId provided, try to get from storage
    if (!campusId) {
      const storedCampusId = this.getCampusIdFromStorage();
      if (storedCampusId && this.isValidId(storedCampusId)) {
        this.actualCampusId = storedCampusId;
        setTimeout(() => {
          this.getProspectusByCampus(storedCampusId);
        }, 100);
        return;
      }
    }
    
    // Otherwise, load prospectus list with current values
    // Use setTimeout to ensure form values are updated first
    setTimeout(() => {
      this.loadProspectusListIfNeeded();
    }, 100);
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Watch for changes in campus or course and fetch prospectus list
    if (changes['value'] && !changes['value'].firstChange) {
      const prevValue = changes['value'].previousValue as ProspectusUploadFormValue;
      const currentValue = changes['value'].currentValue as ProspectusUploadFormValue;
      
      // If campus changed and it's a valid ID (not a file name), reload prospectus list
      if (prevValue.campus !== currentValue.campus && currentValue.campus.trim()) {
        const campusValue = this.actualCampusId || currentValue.campus.trim();
        if (this.isValidId(campusValue)) {
          this.loadProspectusListIfNeeded();
        }
      }
      
      // If course changed (course is stored as courseName string, not numeric ID), reload prospectus list
      if (prevValue.course !== currentValue.course && currentValue.course.trim().length > 0) {
          this.loadProspectusListIfNeeded();
      }
    }
  }

 loadProspectusListIfNeeded(): void {
  console.log('CampusProspectusComponent: loadProspectusListIfNeeded called');

  // ALWAYS resolve campusId from auth/storage first
  let campusValue = this.getCampusIdFromStorage();

  // fallback to actualCampusId if available
  if (!campusValue || !this.isValidId(campusValue)) {
    campusValue = this.actualCampusId.trim();
  }

  // if still missing → stop
  if (!campusValue || !this.isValidId(campusValue)) {
    console.warn('CampusProspectusComponent: valid campusId not found, skipping API call');
    return;
  }

  // lock campusId internally
  this.actualCampusId = campusValue;

  const courseValue = this.value.course.trim();

  console.log('Resolved campusId:', campusValue);
  console.log('Selected course:', courseValue);
  console.log('Selected department:', this.value.department);

  // 🔥 If course selected → load by course
  if (courseValue.length > 0) {
    this.getProspectusByCourse(
      courseValue,
      campusValue
    );
    return;
  }

  //  Otherwise load by campus only
  this.getProspectusByCampus(campusValue);
}


  patch(patch: Partial<ProspectusUploadFormValue>): void {
    const next: ProspectusUploadFormValue = { ...this.value, ...patch };
    this.value = next;
    // Store actual campus ID when user types (not file name)
    if (patch.campus !== undefined) {
      const campusValue = patch.campus.trim();
      
      // Check if it's a campus name (not an ID) - try to find the ID
      const campusByName = this.loadedCampuses().find(c => 
        c.campusName && c.campusName.trim().toLowerCase() === campusValue.toLowerCase()
      );
      
      if (campusByName) {
        // User typed a campus name, get the ID
        const campusId = campusByName.campusId?.trim() || campusByName.id?.trim() || '';
        if (campusId && this.isValidId(campusId)) {
          this.actualCampusId = campusId;
          // Update display value to show name
          const updatedValue = { ...this.value, campus: campusValue };
          this.value = updatedValue;
        }
      } else if (this.isValidId(campusValue)) {
        // It's a valid ID, store it and find the name to display
        const previousCampusId = this.actualCampusId;
        this.actualCampusId = campusValue;
        
        // Find campus name to display
        const campus = this.loadedCampuses().find(c => 
          (c.id && c.id.trim() === campusValue) || 
          (c.campusId && c.campusId.trim() === campusValue)
        );
        const displayName = campus?.campusName?.trim() || campusValue;
        
        // Update display value
        const updatedValue = { ...this.value, campus: displayName };
        this.value = updatedValue;
        
        // If campus ID changed, trigger API call
        if (previousCampusId !== this.actualCampusId) {
          // Use setTimeout to avoid calling API during patch
          setTimeout(() => {
            this.loadProspectusListIfNeeded();
          }, 100);
        }
      }
    }
    
    // If course changed, trigger API call
    // Note: course is stored as courseName (string), not numeric ID
  if (patch.course !== undefined) {
  const courseValue = patch.course.trim();

  if (courseValue.length > 0) {

    // Find selected course only for validation/logging
    const courses = this.loadedCourses();
    const selectedCourse = courses.find(
      course =>
        course.courseName &&
        course.courseName.trim().toLowerCase() === courseValue.toLowerCase()
    );

    // ❗ IMPORTANT FIX:
    // DO NOT override campusId from course selection
    // Campus must always come from auth/storage
    if (selectedCourse) {
      console.log(
        'CampusProspectusComponent: course selected → campusId will remain from auth/storage'
      );
    }

    // Only trigger list reload based on selected course
    setTimeout(() => {
      this.loadProspectusListIfNeeded();
    }, 100);
  }
}

this.valueChange.emit(this.value);
  }

  onCampusFileSelected(file: File | null): void {
    // Store the file, but DON'T overwrite the campus field with file name
    // Keep the campus name in the input field
    this.patch({ campusFile: file });
    
    // Store the original file name temporarily (will be mapped to prospectus ID after upload)
    if (file) {
      // Store in a temporary variable that we'll use when prospectus is uploaded
      // We'll map it to the prospectus ID when we get the upload response
      this._lastUploadedFileName = file.name;
    }
    
    // If file is removed and we have a stored campus ID, restore the campus name for display
    if (!file && this.actualCampusId) {
      // Find campus name to display
      const campus = this.loadedCampuses().find(c => 
        (c.id && c.id.trim() === this.actualCampusId) || 
        (c.campusId && c.campusId.trim() === this.actualCampusId)
      );
      const displayName = campus?.campusName?.trim() || this.actualCampusId;
      this.patch({ campus: displayName });
      // Reload prospectus list if we have a valid campus ID
      if (this.isValidId(this.actualCampusId)) {
        this.loadProspectusListIfNeeded();
      }
    }
  }

  onCourseFileSelected(file: File | null): void {
    this.patch({ courseFile: file });
  }

  submit(): void {
    // Validate course (required)
    const courseName = this.value.course.trim();
    if (!courseName) {
      this.notify.error('Please select a course');
      return;
    }

    // Validate that the selected course exists in the loaded courses for this campus
    const courses = this.loadedCourses();
    const courseExists = courses.some(
      course => course.courseName && course.courseName.trim().toLowerCase() === courseName.toLowerCase()
    );
    
    if (!courseExists) {
      this.notify.error(`Course with name '${courseName}' not found in the selected campus. Please select a valid course name.`);
      // Reload courses to ensure we have the latest data
      this.loadCourses();
      return;
    }

    // Check for files - campusFile should have the file from Campus field
    const files: File[] = [];
    if (this.value.campusFile) {
      files.push(this.value.campusFile);
    }
    if (this.value.courseFile) {
      files.push(this.value.courseFile);
    }

    if (files.length === 0) {
      this.notify.error('Please select at least one prospectus file. Click the paperclip icon to attach a file.');
      return;
    }

    // Get campus ID - prioritize actualCampusId, otherwise try to find ID from campus name
    let campusValue = this.actualCampusId.trim();
    if (!campusValue || !this.isValidId(campusValue)) {
      // Try to find campus ID from the display name
      const campusByName = this.loadedCampuses().find(c => 
        c.campusName && c.campusName.trim().toLowerCase() === this.value.campus.trim().toLowerCase()
      );
      if (campusByName) {
        campusValue = campusByName.campusId?.trim() || campusByName.id?.trim() || '';
      } else if (this.isValidId(this.value.campus.trim())) {
        // If it's already a valid ID, use it
        campusValue = this.value.campus.trim();
      }
    }
    
    // Prepare form value to emit to parent (use campus ID, not name)
    const formValueToEmit: ProspectusUploadFormValue = {
      campus: campusValue,
      campusFile: this.value.campusFile,
      course: courseName,
      courseFile: this.value.courseFile,
        department: this.value.department || undefined  
    };
    
    // Emit submitted event to parent - parent will handle API call
    this.submitted.emit(formValueToEmit);
  }

  /**
   * Get prospectus list by campus ID
   */
  getProspectusByCampus(campusId: string): void {
    if (!campusId.trim()) {
      this.notify.error('Campus ID is required');
      return;
    }

    const trimmedCampusId = campusId.trim();
    console.log('CampusProspectusComponent: getProspectusByCampus called with campusId:', trimmedCampusId);

    this.loadingProspectus.set(true);
    this.campusApi.getProspectusByCampus(trimmedCampusId).subscribe({
      next: (response) => {
        this.loadingProspectus.set(false);
        console.log('CampusProspectusComponent: getProspectusByCampus response:', response);
        
        // Swagger response: { success: boolean, message: string | null, data: ProspectusData[], error: string | null }
        const items = unwrapApiResponse<ProspectusData[]>(response);
        if (Array.isArray(items)) {
          console.log('CampusProspectusComponent: Setting prospectus list with', items.length, 'items');
          
          // Store previous list to detect new prospectuses
          const previousList = this.prospectusList();
          const previousIds = new Set(previousList.map(p => p.id).filter(Boolean));
          
          // Map stored file name to newly uploaded prospectus
          const storedFileName = this._lastUploadedFileName;
          if (storedFileName) {
            // Find the newest prospectus that wasn't in the previous list
            const newProspectuses = items.filter(p => p.id && !previousIds.has(p.id));
            if (newProspectuses.length > 0) {
              // Sort by createdAt (newest first) and take the first one
              const newestProspectus = newProspectuses
                .sort((a, b) => {
                  const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                  const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                  return dateB - dateA;
                })[0];
              
              if (newestProspectus.id) {
                this.prospectusFileNameMap.set(newestProspectus.id, storedFileName);
                console.log('CampusProspectusComponent: Mapped file name', storedFileName, 'to prospectus ID', newestProspectus.id);
                // Clear the stored file name after mapping
                this._lastUploadedFileName = null;
              }
            }
          }
          
          this.prospectusList.set(items);
        } else {
          console.log('CampusProspectusComponent: Response data is not an array, setting empty list');
          this.prospectusList.set([]);
        }
        try {
          this.cdr.detectChanges();
        } catch {
          // Ignore
        }
      },
      error: (err) => {
        const errorMessage = err?.error?.message || err?.message || 'Failed to fetch prospectus list';
        console.error('CampusProspectusComponent: getProspectusByCampus error:', err);
        this.loadingProspectus.set(false);
        this.prospectusList.set([]);
        this.notify.error(errorMessage);
        try {
          this.cdr.detectChanges();
        } catch {
          // Ignore
        }
      },
    });
  }

  /**
   * Get prospectus list by course name
   * @param courseName - Course name to filter by
   * @param providedCampusId - Optional campus ID (if provided, use this instead of form value)
   */
 getProspectusByCourse(courseName: string, providedCampusId?: string): void {
  if (!courseName.trim()) {
    this.notify.error('Course name is required');
    return;
  }

  // Use provided campus ID if available, otherwise get from stored value or form value
  let campusId: string;
  if (providedCampusId && this.isValidId(providedCampusId)) {
    campusId = providedCampusId.trim();
    this.actualCampusId = campusId;
  } else {
    campusId = this.actualCampusId.trim() || this.value.campus.trim();
  }

  if (!campusId || !this.isValidId(campusId)) {
    this.notify.error('Campus ID is required');
    return;
  }

  const trimmedCourseName = courseName.trim();

  console.log(
    'CampusProspectusComponent: getProspectusByCourse called',
    {
      campusId,
      courseName: trimmedCourseName,
      departmentId: this.value.department
    }
  );

  this.loadingProspectus.set(true);

  // 🔥 MAIN CHANGE — departmentId pass ho raha
  this.campusApi
    .getProspectusByCourse(
      campusId,
      trimmedCourseName,
      this.value.department
    )
    .subscribe({
      next: (response) => {
        this.loadingProspectus.set(false);

        console.log(
          'CampusProspectusComponent: getProspectusByCourse response:',
          response
        );

        const items = unwrapApiResponse<ProspectusData[]>(response);

        if (Array.isArray(items)) {
          console.log(
            'CampusProspectusComponent: Setting prospectus list with',
            items.length,
            'items'
          );

          const previousList = this.prospectusList();
          const previousIds = new Set(
            previousList.map((p) => p.id).filter(Boolean)
          );

          const storedFileName = this._lastUploadedFileName;

          if (storedFileName) {
            const newProspectuses = items.filter(
              (p) => p.id && !previousIds.has(p.id)
            );

            if (newProspectuses.length > 0) {
              const newestProspectus = newProspectuses.sort((a, b) => {
                const dateA = a.createdAt
                  ? new Date(a.createdAt).getTime()
                  : 0;
                const dateB = b.createdAt
                  ? new Date(b.createdAt).getTime()
                  : 0;
                return dateB - dateA;
              })[0];

              if (newestProspectus.id) {
                this.prospectusFileNameMap.set(
                  newestProspectus.id,
                  storedFileName
                );
                this._lastUploadedFileName = null;
              }
            }
          }

          this.prospectusList.set(items);
        } else {
          this.prospectusList.set([]);
        }

        try {
          this.cdr.detectChanges();
        } 
catch (e) {
  console.debug('detectChanges skipped', e);
}      },

      error: (err) => {
        this.loadingProspectus.set(false);

        const errorMessage =
          err?.error?.message ||
          err?.message ||
          'Failed to fetch prospectus list';

        console.error(
          'CampusProspectusComponent: getProspectusByCourse error:',
          err
        );

        this.prospectusList.set([]);
        this.notify.error(errorMessage);

        try {
          this.cdr.detectChanges();
        } 
        catch (e) {
  console.debug('detectChanges skipped', e);
}      },
    });
}


  /**
   * Get prospectus by ID
   */
  getProspectusById(prospectusId: string): void {
    if (!prospectusId.trim()) {
      this.notify.error('Prospectus ID is required');
      return;
    }

    this.campusApi.getProspectusById(prospectusId.trim()).subscribe({
      next: (response) => {
        if (response?.data) {
          this.notify.success('Prospectus fetched successfully');
        } else {
          this.notify.error('Prospectus not found');
        }
        try {
          this.cdr.detectChanges();
        } catch {
          // Ignore
        }
      },
      error: (err) => {
        const errorMessage = err?.error?.message || err?.message || 'Failed to fetch prospectus';
        this.notify.error(errorMessage);
        try {
          this.cdr.detectChanges();
        } catch {
          // Ignore
        }
      },
    });
  }

  /**
   * Download prospectus by campus ID and course name
   * Uses prospectus data to get courseName, or falls back to form value
   * Also supports direct download from fileUrls if available in prospectus data
   */
  downloadProspectus(prospectusId: string, fileName?: string): void {
    console.log('CampusProspectusComponent: downloadProspectus called with prospectusId:', prospectusId);
    
    // Try to get prospectus from the list first
    const prospectus = this.prospectusList().find(p => p.id === prospectusId);
    
    // If prospectus has fileUrls directly, download from them (preferred method - faster)
    if (prospectus && prospectus.fileUrls && prospectus.fileUrls.length > 0) {
      console.log('CampusProspectusComponent: Found prospectus with fileUrls, downloading directly:', prospectus.fileUrls);
      const downloadFileName = fileName || this.getFileName(prospectus);
      this.downloadFilesFromUrls(prospectus.fileUrls, downloadFileName);
      this.notify.success(`Downloading prospectus (${prospectus.fileUrls.length} file${prospectus.fileUrls.length > 1 ? 's' : ''})...`);
      return;
    }
    
    // If no fileUrls in prospectus data, use API download endpoint
    // Get campus ID from stored value or form value
    const campusId = this.actualCampusId.trim() || this.value.campus.trim();
    if (!campusId || !this.isValidId(campusId)) {
      this.notify.error('Campus ID is required');
      return;
    }

    // Otherwise, use the API download endpoint
    // Try to get courseName from the prospectus data in the list
    let courseName: string | undefined;
    
    if (prospectus) {
      console.log('CampusProspectusComponent: Found prospectus in list:', prospectus);
      
      // If prospectus has courseId, look up courseName from loaded courses
      if (prospectus.courseId) {
        const course = this.loadedCourses().find(c => c.id === prospectus.courseId);
        if (course?.courseName) {
          courseName = course.courseName.trim();
          console.log('CampusProspectusComponent: Found courseName from loaded courses:', courseName);
        }
      }
      
      // If still no courseName, try to get it from form value
      if (!courseName) {
        courseName = this.value.course.trim();
        console.log('CampusProspectusComponent: Using courseName from form:', courseName);
      }
    } else {
      // Prospectus not in list, use form value
      courseName = this.value.course.trim();
      console.log('CampusProspectusComponent: Prospectus not in list, using courseName from form:', courseName);
    }

    if (!courseName) {
      this.notify.error('Course name is required. Please select a course or ensure prospectus data is loaded.');
      return;
    }

    console.log('CampusProspectusComponent: Downloading prospectus via API with campusId:', campusId, 'courseName:', courseName);

    this.campusApi.downloadProspectus(campusId, courseName).subscribe({
      next: (response) => {
        console.log('CampusProspectusComponent: Download response:', response);
        
        const downloadData = unwrapApiResponse<{ fileUrls?: string[] }>(response);
        if (downloadData?.fileUrls && downloadData.fileUrls.length > 0) {
          // Backend returns fileUrls array - download all files
          const fileUrls = downloadData.fileUrls;
          // Generate dynamic filename: {courseName}-prospectus.{extension}
          const cleanCourseName = courseName.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
          const defaultFileName = fileName || `${cleanCourseName}-prospectus.pdf`;
          this.downloadFilesFromUrls(fileUrls, defaultFileName);
          this.notify.success(`Prospectus downloaded successfully (${fileUrls.length} file${fileUrls.length > 1 ? 's' : ''})`);
        } else {
          console.error('CampusProspectusComponent: No file URLs in response:', response);
          this.notify.error('No file URL found in response');
        }
      },
      error: (err) => {
        console.error('CampusProspectusComponent: Download error:', err);
        const errorMessage = err?.error?.message || err?.message || 'Failed to download prospectus';
        this.notify.error(errorMessage);
      },
    });
  }

  /**
   * Helper method to download files from URLs
   */
  private downloadFilesFromUrls(fileUrls: string[], defaultFileName: string): void {
    fileUrls.forEach((fileUrl, index) => {
      // Create download link
      const link = document.createElement('a');
      link.href = fileUrl;
      
      // Extract filename from URL or use provided/default name
      let downloadFileName = defaultFileName;
      if (fileUrls.length > 1) {
        // If multiple files, add index to filename
        try {
          const urlParts = fileUrl.split('/');
          const urlFileName = urlParts[urlParts.length - 1];
          if (urlFileName && urlFileName.includes('.')) {
            downloadFileName = urlFileName;
          } else {
            const ext = defaultFileName.split('.').pop() || 'pdf';
            const nameWithoutExt = defaultFileName.replace(`.${ext}`, '');
            downloadFileName = `${nameWithoutExt}-${index + 1}.${ext}`;
          }
        } catch {
          const ext = defaultFileName.split('.').pop() || 'pdf';
          const nameWithoutExt = defaultFileName.replace(`.${ext}`, '');
          downloadFileName = `${nameWithoutExt}-${index + 1}.${ext}`;
        }
      } else {
        // Single file - try to extract from URL
        try {
          const urlParts = fileUrl.split('/');
          const urlFileName = urlParts[urlParts.length - 1];
          if (urlFileName && urlFileName.includes('.')) {
            downloadFileName = urlFileName;
          }
        } catch {
          // Use default
        }
      }
      
      link.download = downloadFileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  /**
   * Emit delete request to parent (parent shows confirmation modal)
   */
  onDeleteClick(prospectus: ProspectusData): void {
    const id = prospectus.id?.trim();
    if (!id) {
      this.notify.error('Prospectus ID is required');
      return;
    }
    this.deleteRequested.emit({
      id,
      name: this.getFileName(prospectus),
      departmentId: this.value.department || undefined,
    });
  }


  private convertFileToBase64(file: File | null): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!file) {
        resolve('');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/jpeg;base64,") and return just the base64 string
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = () => {
        reject(new Error('Failed to convert file to base64'));
      };
      reader.readAsDataURL(file);
    });
  }

  private isFormValid(): boolean {
    // Course is required
    const hasCourse = this.value.course.trim().length > 0;
    
    // At least one file is required (campusFile or courseFile)
    const hasFile = this.value.campusFile !== null || this.value.courseFile !== null;
    
    // Campus ID is optional in form - parent will get it from auth state/storage
    // But if user enters it manually, validate it
    const hasValidCampusId = (this.actualCampusId.trim().length > 0 && this.isValidId(this.actualCampusId.trim())) ||
                             (this.value.campus.trim().length > 0 && this.isValidId(this.value.campus.trim())) ||
                             this.value.campus.trim().length === 0; // Empty is OK - parent will get from auth

    return hasCourse && hasFile && hasValidCampusId;
  }

  /**
   * Format date for display
   */
  formatDate(dateString?: string): string {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  }

  /**
   * Get file name for a prospectus (without extension for display)
   * Format: {courseName}-prospectus
   * Example: BCA-prospectus
   */
  getFileName(prospectus: ProspectusData): string {
    // Get course name from prospectus courseId
    let courseName = '';
    if (prospectus.courseId) {
      const course = this.loadedCourses().find(c => c.id === prospectus.courseId);
      if (course?.courseName) {
        courseName = course.courseName.trim();
      }
    }
    
    // If no course name found, try to get from form value as fallback
    if (!courseName) {
      courseName = this.value.course.trim();
    }
    
    // Generate filename: {courseName}-prospectus (without extension)
    if (courseName) {
      // Clean course name: remove special characters that might cause issues in filename
      const cleanCourseName = courseName.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
      return `${cleanCourseName}-prospectus`;
    }
    
    // Fallback if no course name: just use prospectus
    return `prospectus`;
  }
}
