import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, inject, Input, OnChanges, OnInit, Output, signal, SimpleChanges } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { InputWithFileComponent } from '../../../../shared/components/input-with-file/input-with-file.component';
import { DropdownComponent } from '../../../../shared/components/dropdown/dropdown.component';
import { CampusApiService, ProspectusData } from '../../services/campus-api.service';
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
export class CampusProspectusComponent implements OnInit, OnChanges {
  private readonly campusApi = inject(CampusApiService);
  private readonly notify = inject(NotificationService);
  private readonly cdr = inject(ChangeDetectorRef);

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
   * Check if a string is a valid numeric ID (not a file name)
   */
  private isValidId(value: string): boolean {
    if (!value || !value.trim()) return false;
    // Check if it's a numeric string (campus/course ID)
    // File names typically have extensions like .jpg, .pdf, etc.
    const trimmed = value.trim();
    // If it contains a dot followed by letters (file extension), it's likely a file name
    if (/\.\w+$/.test(trimmed)) {
      return false;
    }
    // Check if it's a valid number
    return /^\d+$/.test(trimmed);
  }

  // Course items - using text values like "BCA", "MCA", etc.
  // Note: These should be fetched from API in production
  readonly courseItems = [
    { label: 'BCA', value: 'BCA' },
    { label: 'MCA', value: 'MCA' },
    { label: 'B.Tech', value: 'B.Tech' },
    { label: 'M.Tech', value: 'M.Tech' },
    { label: 'MBA', value: 'MBA' },
    { label: 'BBA', value: 'BBA' },
  ] as const;

  ngOnInit(): void {
    console.log('ProspectusComponent: Component initialized');
    // Fetch prospectus list on component initialization if campus or course is already selected
    this.loadProspectusListIfNeeded();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Watch for changes in campus or course and fetch prospectus list
    if (changes['value'] && !changes['value'].firstChange) {
      const prevValue = changes['value'].previousValue as ProspectusUploadFormValue;
      const currentValue = changes['value'].currentValue as ProspectusUploadFormValue;
      
      console.log('ProspectusComponent: Value changed');
      console.log('ProspectusComponent: Previous campus:', prevValue.campus);
      console.log('ProspectusComponent: Current campus:', currentValue.campus);
      console.log('ProspectusComponent: Previous course:', prevValue.course);
      console.log('ProspectusComponent: Current course:', currentValue.course);
      
      // If campus changed and it's a valid ID (not a file name), reload prospectus list
      if (prevValue.campus !== currentValue.campus && currentValue.campus.trim()) {
        const campusValue = this.actualCampusId || currentValue.campus.trim();
        if (this.isValidId(campusValue)) {
          console.log('ProspectusComponent: Campus ID changed, reloading prospectus list');
          this.loadProspectusListIfNeeded();
        } else {
          console.log('ProspectusComponent: Campus value is not a valid ID, skipping API call');
        }
      }
      
      // If course changed and it's a valid ID, reload prospectus list
      if (prevValue.course !== currentValue.course && currentValue.course.trim()) {
        if (this.isValidId(currentValue.course.trim())) {
          console.log('ProspectusComponent: Course ID changed, reloading prospectus list');
          this.loadProspectusListIfNeeded();
        } else {
          console.log('ProspectusComponent: Course value is not a valid ID, skipping API call');
        }
      }
    }
  }

  loadProspectusListIfNeeded(): void {
    console.log('ProspectusComponent: ========== loadProspectusListIfNeeded CALLED ==========');
    console.log('ProspectusComponent: actualCampusId:', this.actualCampusId);
    console.log('ProspectusComponent: value.campus:', this.value.campus);
    console.log('ProspectusComponent: value.course:', this.value.course);
    
    // Only call API if we have a valid campus ID (numeric, not a file name)
    const campusValue = this.actualCampusId || this.value.campus.trim();
    console.log('ProspectusComponent: Campus value to check:', campusValue);
    console.log('ProspectusComponent: Is campus value valid ID?', this.isValidId(campusValue));
    
    if (campusValue && this.isValidId(campusValue)) {
      console.log('ProspectusComponent: ✅ Calling GET API by Campus ID:', campusValue);
      this.getProspectusByCampus(campusValue);
      return;
    }
    
    // Only call API if we have a valid course ID (numeric)
    const courseValue = this.value.course.trim();
    console.log('ProspectusComponent: Course value to check:', courseValue);
    console.log('ProspectusComponent: Is course value valid ID?', this.isValidId(courseValue));
    
    if (courseValue && this.isValidId(courseValue)) {
      console.log('ProspectusComponent: ✅ Calling GET API by Course ID:', courseValue);
      this.getProspectusByCourse(courseValue);
      return;
    }
    
    // If campus value exists but is not a valid ID (might be file name), don't call API
    if (this.value.campus.trim() && !this.isValidId(this.value.campus.trim())) {
      console.log('ProspectusComponent: ⚠️ Campus value is a file name, not calling API:', this.value.campus.trim());
    }
    
    console.log('ProspectusComponent: ⚠️ No valid campus or course ID found, skipping API call');
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
        console.log('ProspectusComponent: Stored actual campus ID:', this.actualCampusId);
        // If campus ID changed, trigger API call
        if (previousCampusId !== this.actualCampusId) {
          console.log('ProspectusComponent: Campus ID changed, will trigger API call');
          // Use setTimeout to avoid calling API during patch
          setTimeout(() => {
            this.loadProspectusListIfNeeded();
          }, 100);
        }
      } else if (campusValue) {
        // If it's not a valid ID (might be file name or partial input), log it
        console.log('ProspectusComponent: Campus value is not a valid numeric ID:', campusValue);
        // Don't clear actualCampusId - keep the last valid ID
      }
    }
    
    // If course changed, trigger API call
    if (patch.course !== undefined) {
      const courseValue = patch.course.trim();
      if (this.isValidId(courseValue)) {
        console.log('ProspectusComponent: Course ID changed, will trigger API call:', courseValue);
        // Use setTimeout to avoid calling API during patch
        setTimeout(() => {
          this.loadProspectusListIfNeeded();
        }, 100);
      }
    }
    
    this.valueChange.emit(next);
  }

  onCampusFileSelected(file: File | null): void {
    console.log('ProspectusComponent: ========== CAMPUS FILE SELECTED ==========');
    console.log('ProspectusComponent: File:', file?.name || 'null');
    console.log('ProspectusComponent: File size:', file?.size || 'N/A', 'bytes');
    console.log('ProspectusComponent: File type:', file?.type || 'N/A');
    console.log('ProspectusComponent: Current campus ID:', this.actualCampusId);
    console.log('ProspectusComponent: Current campus value:', this.value.campus);
    
    // Store the file, but DON'T overwrite the campus field with file name
    // Keep the campus ID in the input field
    this.patch({ campusFile: file });
    
    // If file is removed and we have a stored campus ID, restore it
    if (!file && this.actualCampusId) {
      console.log('ProspectusComponent: Campus file removed, restoring campus ID:', this.actualCampusId);
      this.patch({ campus: this.actualCampusId });
      // Reload prospectus list if we have a valid campus ID
      if (this.isValidId(this.actualCampusId)) {
        this.loadProspectusListIfNeeded();
      }
    }
  }

  onCourseFileSelected(file: File | null): void {
    console.log('ProspectusComponent: ========== COURSE FILE SELECTED ==========');
    console.log('ProspectusComponent: File:', file?.name || 'null');
    console.log('ProspectusComponent: File size:', file?.size || 'N/A', 'bytes');
    console.log('ProspectusComponent: File type:', file?.type || 'N/A');
    this.patch({ courseFile: file });
  }

  submit(): void {
    console.log('🚀🚀🚀 ProspectusComponent: ========== SUBMIT METHOD CALLED ========== 🚀🚀🚀');
    console.log('ProspectusComponent: Form value:', JSON.stringify(this.value, null, 2));
    console.log('ProspectusComponent: Campus field value:', this.value.campus);
    console.log('ProspectusComponent: Campus field is valid ID?', this.isValidId(this.value.campus.trim()));
    console.log('ProspectusComponent: Campus File:', this.value.campusFile?.name || 'null');
    console.log('ProspectusComponent: Course:', this.value.course);
    console.log('ProspectusComponent: Course File:', this.value.courseFile?.name || 'null');
    console.log('ProspectusComponent: Stored Actual Campus ID:', this.actualCampusId);
    console.log('ProspectusComponent: Submitting flag:', this.submitting);

    // Check form validation first
    const validationResult = this.isFormValid();
    console.log('ProspectusComponent: Form validation result:', validationResult);
    
    if (!validationResult) {
      console.error('ProspectusComponent: ❌ Form validation failed');
      console.error('ProspectusComponent: Validation details:', {
        hasCampusId: (this.actualCampusId.trim().length > 0) || (this.value.campus.trim().length > 0 && this.isValidId(this.value.campus.trim())),
        hasFile: this.value.campusFile !== null || this.value.courseFile !== null,
        hasCourse: this.value.course.trim().length > 0
      });
      this.notify.error('Please fill all fields: Campus ID (numeric), Course, and at least one file');
      return;
    }

    // Get campus ID - prefer actualCampusId (stored when user typed), then check campus field
    let campusId = this.actualCampusId.trim();
    if (!campusId) {
      const campusValue = this.value.campus.trim();
      if (this.isValidId(campusValue)) {
        campusId = campusValue;
        console.log('ProspectusComponent: Using campus field value as campus ID:', campusId);
      } else {
        console.error('ProspectusComponent: ❌ Campus ID is required and must be numeric');
        console.error('ProspectusComponent: Campus field value:', campusValue);
        console.error('ProspectusComponent: Stored actualCampusId:', this.actualCampusId);
        this.notify.error('Please enter a valid Campus ID (numeric) in the Campus field');
        return;
      }
    } else {
      console.log('ProspectusComponent: Using stored actualCampusId:', campusId);
    }

    // Get course ID
    const courseId = this.value.course.trim();
    if (!courseId) {
      console.error('ProspectusComponent: Course ID is required');
      this.notify.error('Please select a course');
      return;
    }

    // Collect all files (campusFile and courseFile are both prospectus files)
    const filesToConvert: (File | null)[] = [];
    if (this.value.campusFile) {
      filesToConvert.push(this.value.campusFile);
    }
    if (this.value.courseFile) {
      filesToConvert.push(this.value.courseFile);
    }

    if (filesToConvert.length === 0) {
      console.error('ProspectusComponent: At least one file is required');
      this.notify.error('Please select at least one prospectus file');
      return;
    }

    console.log('ProspectusComponent: ✅ All validations passed!');
    console.log('ProspectusComponent: Campus ID:', campusId);
    console.log('ProspectusComponent: Course ID:', courseId);
    console.log('ProspectusComponent: Files to convert:', filesToConvert.length);
    filesToConvert.forEach((file, index) => {
      console.log(`ProspectusComponent: File ${index + 1}:`, file?.name || 'null', 'Size:', file?.size || 'N/A');
    });

    // Prepare form value with correct campus ID (ensure it's the numeric ID, not file name)
    const formValueToEmit: ProspectusUploadFormValue = {
      campus: campusId, // Use the validated campus ID
      campusFile: this.value.campusFile,
      course: courseId,
      courseFile: this.value.courseFile,
    };

    console.log('ProspectusComponent: Emitting submitted event with form value:', JSON.stringify({
      campus: formValueToEmit.campus,
      course: formValueToEmit.course,
      campusFile: formValueToEmit.campusFile?.name || 'null',
      courseFile: formValueToEmit.courseFile?.name || 'null'
    }));

    // Emit submitted event to parent - parent will handle submitting state and API call
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
    console.log('========== GET PROSPECTUS BY CAMPUS API CALL ==========');
    console.log('Campus ID:', trimmedCampusId);
    console.log('API Endpoint: GET /prospectus/campus/' + trimmedCampusId);
    console.log('Loading state: true');

    this.loadingProspectus.set(true);
    this.campusApi.getProspectusByCampus(trimmedCampusId).subscribe({
      next: (response) => {
        this.loadingProspectus.set(false);
        console.log('========== GET PROSPECTUS BY CAMPUS - SUCCESS ==========');
        console.log('Full Response:', JSON.stringify(response, null, 2));
        console.log('Response Success:', response?.success);
        console.log('Response Message:', response?.message);
        console.log('Response Data:', response?.data);
        console.log('Response Error:', response?.error);
        console.log('Data is Array?', Array.isArray(response?.data));
        console.log('Data Length:', response?.data?.length || 0);
        
        // Swagger response: { success: boolean, message: string | null, data: ProspectusData[], error: string | null }
        if (response && Array.isArray(response.data)) {
          this.prospectusList.set(response.data);
          console.log('✅ Prospectus list set successfully. Count:', response.data.length);
          if (response.data.length > 0) {
            console.log('Prospectus Items:', response.data);
          } else {
            console.log('⚠️ No prospectuses found for campus ID:', trimmedCampusId);
          }
        } else {
          this.prospectusList.set([]);
          console.log('⚠️ Response data is not an array or missing. Setting empty list.');
        }
        try {
          this.cdr.detectChanges();
        } catch {
          // Ignore
        }
      },
      error: (err) => {
        const errorMessage = err?.error?.message || err?.message || 'Failed to fetch prospectus list';
        console.error('========== GET PROSPECTUS BY CAMPUS - ERROR ==========');
        console.error('Campus ID:', trimmedCampusId);
        console.error('Error Object:', err);
        console.error('Error Status:', err?.status);
        console.error('Error Status Text:', err?.statusText);
        console.error('Error Message:', errorMessage);
        console.error('Error Details:', err?.error);
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
   * Get prospectus list by course ID
   */
  getProspectusByCourse(courseId: string): void {
    if (!courseId.trim()) {
      this.notify.error('Course ID is required');
      return;
    }

    const trimmedCourseId = courseId.trim();
    console.log('========== GET PROSPECTUS BY COURSE API CALL ==========');
    console.log('Course ID:', trimmedCourseId);
    console.log('API Endpoint: GET /prospectus/course/' + trimmedCourseId);
    console.log('Loading state: true');

    this.loadingProspectus.set(true);
    this.campusApi.getProspectusByCourse(trimmedCourseId).subscribe({
      next: (response) => {
        this.loadingProspectus.set(false);
        console.log('========== GET PROSPECTUS BY COURSE - SUCCESS ==========');
        console.log('Full Response:', JSON.stringify(response, null, 2));
        console.log('Response Success:', response?.success);
        console.log('Response Message:', response?.message);
        console.log('Response Data:', response?.data);
        console.log('Response Error:', response?.error);
        console.log('Data is Array?', Array.isArray(response?.data));
        console.log('Data Length:', response?.data?.length || 0);
        
        // Swagger response: { success: boolean, message: string | null, data: ProspectusData[], error: string | null }
        if (response && Array.isArray(response.data)) {
          this.prospectusList.set(response.data);
          console.log('✅ Prospectus list set successfully. Count:', response.data.length);
          if (response.data.length > 0) {
            console.log('Prospectus Items:', response.data);
          } else {
            console.log('⚠️ No prospectuses found for course ID:', trimmedCourseId);
          }
        } else {
          this.prospectusList.set([]);
          console.log('⚠️ Response data is not an array or missing. Setting empty list.');
        }
        try {
          this.cdr.detectChanges();
        } catch {
          // Ignore
        }
      },
      error: (err) => {
        const errorMessage = err?.error?.message || err?.message || 'Failed to fetch prospectus list';
        console.error('========== GET PROSPECTUS BY COURSE - ERROR ==========');
        console.error('Course ID:', trimmedCourseId);
        console.error('Error Object:', err);
        console.error('Error Status:', err?.status);
        console.error('Error Status Text:', err?.statusText);
        console.error('Error Message:', errorMessage);
        console.error('Error Details:', err?.error);
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
          console.log('Prospectus fetched by ID:', response.data);
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
        console.error('Failed to fetch prospectus by ID:', errorMessage);
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
   * Download prospectus by ID
   */
  downloadProspectus(prospectusId: string, fileName?: string): void {
    if (!prospectusId.trim()) {
      this.notify.error('Prospectus ID is required');
      return;
    }

    this.campusApi.downloadProspectus(prospectusId.trim()).subscribe({
      next: (blob) => {
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName || `prospectus-${prospectusId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        this.notify.success('Prospectus downloaded successfully');
        console.log('Prospectus downloaded successfully');
      },
      error: (err) => {
        const errorMessage = err?.error?.message || err?.message || 'Failed to download prospectus';
        console.error('Failed to download prospectus:', errorMessage);
        this.notify.error(errorMessage);
      },
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
        console.log('Prospectus deleted successfully:', response);
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
        console.error('Failed to delete prospectus:', errorMessage);
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
    // Campus ID is required (either typed or stored in actualCampusId)
    const hasCampusId = (this.actualCampusId.trim().length > 0) || 
                       (this.value.campus.trim().length > 0 && this.isValidId(this.value.campus.trim()));
    
    // At least one file is required (campusFile or courseFile)
    const hasFile = this.value.campusFile !== null || this.value.courseFile !== null;
    
    // Course is required
    const hasCourse = this.value.course.trim().length > 0;

    console.log('ProspectusComponent: Form validation check:', {
      hasCampusId,
      hasFile,
      hasCourse,
      campus: this.value.campus,
      actualCampusId: this.actualCampusId,
      campusFile: this.value.campusFile?.name || 'null',
      courseFile: this.value.courseFile?.name || 'null',
      course: this.value.course
    });

    return hasCampusId && hasFile && hasCourse;
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
