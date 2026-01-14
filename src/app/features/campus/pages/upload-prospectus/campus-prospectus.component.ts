import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, inject, Input, OnChanges, OnDestroy, OnInit, Output, PLATFORM_ID, signal, SimpleChanges } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { InputWithFileComponent } from '../../../../shared/components/input-with-file/input-with-file.component';
import { DropdownComponent } from '../../../../shared/components/dropdown/dropdown.component';
import { CampusApiService, ProspectusData, AddCourseResponseData } from '../../services/campus-api.service';
import { NotificationService } from '../../../../core/notifications/notification.service';

export interface ProspectusUploadFormValue {
  campus: string;
  campusFile: File | null;
  course: string;
  courseFile: File | null;
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
  
  // Event handler for courseAdded event
  private courseAddedHandler: (() => void) | null = null;

  @Input() submitting = false;
  @Input() value: ProspectusUploadFormValue = {
    campus: '',
    campusFile: null,
    course: '',
    courseFile: null,
  };

  @Output() valueChange = new EventEmitter<ProspectusUploadFormValue>();
  @Output() submitted = new EventEmitter<ProspectusUploadFormValue>();
  @Output() uploadSuccess = new EventEmitter<void>();

  // Prospectus management state
  readonly prospectusList = signal<readonly ProspectusData[]>([]);
  loadingProspectus = signal(false);
  
  // Store actual campus ID separately (for API)
  private actualCampusId = '';

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

  ngOnInit(): void {
    // Load courses from API
    this.loadCourses();
    // Fetch prospectus list on component initialization if campus or course is already selected
    this.loadProspectusListIfNeeded();
    
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

  ngOnDestroy(): void {
    // Remove event listener when component is destroyed (only in browser)
    if (this.isBrowser && this.courseAddedHandler) {
      window.removeEventListener('courseAdded', this.courseAddedHandler);
      this.courseAddedHandler = null;
    }
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
        this.notify.error('Failed to load courses. Please refresh the page or contact support.');
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
   */
  refreshProspectusList(campusId?: string, courseName?: string): void {
    console.log('CampusProspectusComponent: refreshProspectusList called', { campusId, courseName });
    
    // If campusId is provided, store it and update form value
    if (campusId && this.isValidId(campusId)) {
      this.actualCampusId = campusId.trim();
      // Update form value to ensure list section is visible (only if current value is not a valid ID)
      if (!this.value.campus.trim() || !this.isValidId(this.value.campus.trim())) {
        this.patch({ campus: campusId.trim() });
      }
    }
    
    // If courseName is provided, update form value to ensure list section is visible
    if (courseName && courseName.trim()) {
      if (this.value.course.trim() !== courseName.trim()) {
        this.patch({ course: courseName.trim() });
      }
    }
    
    // If we have both campusId and courseName, load directly (more reliable)
    if (campusId && this.isValidId(campusId) && courseName && courseName.trim()) {
      console.log('CampusProspectusComponent: Loading prospectus directly with provided campusId and courseName');
      setTimeout(() => {
        this.getProspectusByCourse(courseName.trim(), campusId.trim());
      }, 100);
      return;
    }
    
    // If we have campusId but no courseName, load by campus directly
    if (campusId && this.isValidId(campusId)) {
      console.log('CampusProspectusComponent: Loading prospectus directly with provided campusId (no course)');
      setTimeout(() => {
        this.getProspectusByCampus(campusId.trim());
      }, 100);
      return;
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
    console.log('CampusProspectusComponent: actualCampusId:', this.actualCampusId);
    console.log('CampusProspectusComponent: value.campus:', this.value.campus);
    console.log('CampusProspectusComponent: value.course:', this.value.course);
    
    // Get campus ID from stored value (prioritize actualCampusId over form value)
    // Only use form value if it's a valid ID (not a file name)
    let campusValue = this.actualCampusId.trim();
    if (!campusValue || !this.isValidId(campusValue)) {
      const formCampus = this.value.campus.trim();
      if (formCampus && this.isValidId(formCampus)) {
        campusValue = formCampus;
        this.actualCampusId = campusValue; // Store it for future use
      }
    }
    
    const courseValue = this.value.course.trim();
    
    // Prioritize loading by course if we have both campus ID and course name (more specific)
    if (courseValue && courseValue.length > 0 && campusValue && this.isValidId(campusValue)) {
      console.log('CampusProspectusComponent: Loading prospectus by course (more specific):', courseValue, 'campusId:', campusValue);
      this.getProspectusByCourse(courseValue, campusValue);
      return;
    }
    
    // If we have a valid campus ID but no course, load by campus
    if (campusValue && this.isValidId(campusValue)) {
      console.log('CampusProspectusComponent: Loading prospectus by campus:', campusValue);
      this.getProspectusByCampus(campusValue);
      return;
    }
    
    // If we only have a course name, try to load by course (will check for campus ID)
    if (courseValue && courseValue.length > 0) {
      console.log('CampusProspectusComponent: Loading prospectus by course:', courseValue);
      // getProspectusByCourse will check for campus ID and show error if missing
      this.getProspectusByCourse(courseValue);
      return;
    }
    
    console.log('CampusProspectusComponent: No valid campus ID or course name, skipping prospectus load');
  }

  patch(patch: Partial<ProspectusUploadFormValue>): void {
    const next: ProspectusUploadFormValue = { ...this.value, ...patch };
    this.value = next;
    // Store actual campus ID when user types (not file name)
    if (patch.campus !== undefined) {
      const campusValue = patch.campus.trim();
      // Only store as actualCampusId if it's a valid ID (numeric)
      if (this.isValidId(campusValue)) {
        // Always update actualCampusId when a valid numeric ID is entered
        const previousCampusId = this.actualCampusId;
        this.actualCampusId = campusValue;
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
        // Find the selected course object and extract campusId
        const courses = this.loadedCourses();
        const selectedCourse = courses.find(
          course => course.courseName && course.courseName.trim().toLowerCase() === courseValue.toLowerCase()
        );
        
        // If course found and has campusId, store it
        if (selectedCourse && selectedCourse.campusId) {
          const campusId = selectedCourse.campusId.trim();
          if (this.isValidId(campusId)) {
            console.log('CampusProspectusComponent: Extracted campusId from selected course:', campusId);
            this.actualCampusId = campusId;
            // Also update the form value if it's empty or not a valid ID
            if (!this.value.campus.trim() || !this.isValidId(this.value.campus.trim())) {
              // Directly update the value to avoid recursion
              const updatedValue = { ...this.value, campus: campusId };
              this.value = updatedValue;
              this.valueChange.emit(updatedValue);
            }
          }
        }
        
        // Use setTimeout to avoid calling API during patch
        setTimeout(() => {
          this.loadProspectusListIfNeeded();
        }, 100);
      }
    }
    
    this.valueChange.emit(next);
  }

  onCampusFileSelected(file: File | null): void {
    // Store the file, but DON'T overwrite the campus field with file name
    // Keep the campus ID in the input field
    this.patch({ campusFile: file });
    
    // If file is removed and we have a stored campus ID, restore it
    if (!file && this.actualCampusId) {
      this.patch({ campus: this.actualCampusId });
      // Reload prospectus list if we have a valid campus ID
      if (this.isValidId(this.actualCampusId)) {
        this.loadProspectusListIfNeeded();
      }
    }
  }

  onCourseFileSelected(file: File | null): void {
    this.patch({ courseFile: file });
  }

  onFormSubmit(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.submit();
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

    // Campus ID will be retrieved by parent from auth state
    const campusValue = this.actualCampusId.trim() || this.value.campus.trim();
    
    // Prepare form value to emit to parent
    const formValueToEmit: ProspectusUploadFormValue = {
      campus: campusValue,
      campusFile: this.value.campusFile,
      course: courseName,
      courseFile: this.value.courseFile,
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
        if (response && Array.isArray(response.data)) {
          console.log('CampusProspectusComponent: Setting prospectus list with', response.data.length, 'items');
          this.prospectusList.set(response.data);
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
      // Also store it for future use
      this.actualCampusId = campusId;
    } else {
      campusId = this.actualCampusId.trim() || this.value.campus.trim();
    }
    
    if (!campusId || !this.isValidId(campusId)) {
      this.notify.error('Campus ID is required');
      return;
    }

    const trimmedCourseName = courseName.trim();
    console.log('CampusProspectusComponent: getProspectusByCourse called with campusId:', campusId, 'courseName:', trimmedCourseName);

    this.loadingProspectus.set(true);
    this.campusApi.getProspectusByCourse(campusId, trimmedCourseName).subscribe({
      next: (response) => {
        this.loadingProspectus.set(false);
        console.log('CampusProspectusComponent: getProspectusByCourse response:', response);
        
        // Swagger response: { success: boolean, message: string | null, data: ProspectusData[], error: string | null }
        if (response && Array.isArray(response.data)) {
          console.log('CampusProspectusComponent: Setting prospectus list with', response.data.length, 'items');
          this.prospectusList.set(response.data);
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
        console.error('CampusProspectusComponent: getProspectusByCourse error:', err);
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
        
        if (response?.success && response.data?.fileUrls && response.data.fileUrls.length > 0) {
          // Backend returns fileUrls array - download all files
          const fileUrls = response.data.fileUrls;
          this.downloadFilesFromUrls(fileUrls, fileName || `prospectus-${courseName}.pdf`);
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
   * Delete prospectus by ID
   */
  deleteProspectus(prospectusId: string): void {
    if (!prospectusId.trim()) {
      this.notify.error('Prospectus ID is required');
      return;
    }

    // Confirm before deleting
    if (!confirm('Are you sure you want to delete this prospectus?')) {
      return;
    }

    this.campusApi.deleteProspectus(prospectusId.trim()).subscribe({
      next: (response) => {
        this.notify.success(response?.message || 'Prospectus deleted successfully');
        // Refresh prospectus list from server
        this.loadProspectusListIfNeeded();
        try {
          this.cdr.detectChanges();
        } catch {
          // Ignore
        }
      },
      error: (err) => {
        const errorMessage = err?.error?.message || err?.message || 'Failed to delete prospectus';
        this.notify.error(errorMessage);
        try {
          this.cdr.detectChanges();
        } catch {
          // Ignore
        }
      },
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
   * Get file name from URL or use default
   */
  getFileName(prospectus: ProspectusData): string {
    if (prospectus.fileUrls && prospectus.fileUrls.length > 0) {
      const url = prospectus.fileUrls[0];
      const fileName = url.split('/').pop() || url;
      return fileName.length > 30 ? fileName.substring(0, 30) + '...' : fileName;
    }
    return `prospectus-${prospectus.id || 'file'}.pdf`;
  }
}
