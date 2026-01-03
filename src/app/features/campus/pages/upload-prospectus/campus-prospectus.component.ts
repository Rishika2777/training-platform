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

  readonly courseItems = [
    { label: 'Course 1', value: 'course1' },
    { label: 'Course 2', value: 'course2' },
    { label: 'Course 3', value: 'course3' },
  ] as const;

  ngOnInit(): void {
    // Fetch prospectus list on component initialization if campus or course is already selected
    this.loadProspectusListIfNeeded();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Watch for changes in campus or course and fetch prospectus list
    if (changes['value'] && !changes['value'].firstChange) {
      const prevValue = changes['value'].previousValue as ProspectusUploadFormValue;
      const currentValue = changes['value'].currentValue as ProspectusUploadFormValue;
      
      // If campus or course changed, reload prospectus list
      if (
        (prevValue.campus !== currentValue.campus && currentValue.campus.trim()) ||
        (prevValue.course !== currentValue.course && currentValue.course.trim())
      ) {
        this.loadProspectusListIfNeeded();
      }
    }
  }

  loadProspectusListIfNeeded(): void {
    if (this.value.campus.trim()) {
      this.getProspectusByCampus(this.value.campus.trim());
    } else if (this.value.course.trim()) {
      this.getProspectusByCourse(this.value.course.trim());
    }
  }

  patch(patch: Partial<ProspectusUploadFormValue>): void {
    const next: ProspectusUploadFormValue = { ...this.value, ...patch };
    this.value = next;
    // Store actual campus ID when user types (not file name)
    if (patch.campus !== undefined && !this.value.campusFile) {
      this.actualCampusId = patch.campus;
    }
    this.valueChange.emit(next);
  }

  onCampusFileSelected(file: File | null): void {
    this.patch({ campusFile: file });
    // Show file name in the input field
    if (file) {
      this.patch({ campus: file.name });
    } else {
      // Restore actual campus ID if file is removed
      this.patch({ campus: this.actualCampusId });
    }
  }

  onCourseFileSelected(file: File | null): void {
    this.patch({ courseFile: file });
  }

  submit(): void {
    if (!this.isFormValid()) {
      this.notify.error('Please fill all fields and select files');
      return;
    }

    this.submitting = true;

    // Convert both files to base64
    Promise.all([
      this.convertFileToBase64(this.value.campusFile),
      this.convertFileToBase64(this.value.courseFile),
    ])
      .then(([campusFileBase64, courseFileBase64]) => {
        const files: string[] = [];
        if (campusFileBase64) {
          files.push(campusFileBase64);
        }
        if (courseFileBase64) {
          files.push(courseFileBase64);
        }

        const request = {
          campusId: this.actualCampusId.trim() || this.value.campus.trim(),
          courseId: this.value.course.trim(),
          files: files,
        };

        this.campusApi.uploadProspectus(request).subscribe({
          next: (response) => {
            console.log('API Integration Working - Prospectus Uploaded Successfully', response);
            this.submitting = false;
            this.notify.success(response?.message || 'Prospectus uploaded successfully');
            this.uploadSuccess.emit();
            // Refresh prospectus list if we have campusId or courseId
            if (this.value.campus.trim()) {
              this.getProspectusByCampus(this.value.campus.trim());
            } else if (this.value.course.trim()) {
              this.getProspectusByCourse(this.value.course.trim());
            }
            try {
              this.cdr.detectChanges();
            } catch {
              // Ignore
            }
          },
          error: (err) => {
            const errorMessage = err?.error?.message || err?.message || 'Failed to upload prospectus';
            console.error('API Integration Failed -', errorMessage);
            this.submitting = false;
            this.notify.error(errorMessage);
            try {
              this.cdr.detectChanges();
            } catch {
              // Ignore
            }
          },
        });
      })
      .catch((error) => {
        console.error('Failed to convert files to base64:', error);
        this.submitting = false;
        this.notify.error('Failed to process files. Please try again.');
        try {
          this.cdr.detectChanges();
        } catch {
          // Ignore
        }
      });
  }

  /**
   * Get prospectus list by campus ID
   */
  getProspectusByCampus(campusId: string): void {
    if (!campusId.trim()) {
      this.notify.error('Campus ID is required');
      return;
    }

    this.loadingProspectus.set(true);
    this.campusApi.getProspectusByCampus(campusId.trim()).subscribe({
      next: (response) => {
        this.loadingProspectus.set(false);
        if (response?.data) {
          this.prospectusList.set(response.data);
          console.log('Prospectus list fetched successfully:', response.data);
        } else {
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
        console.error('Failed to fetch prospectus list:', errorMessage);
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

    this.loadingProspectus.set(true);
    this.campusApi.getProspectusByCourse(courseId.trim()).subscribe({
      next: (response) => {
        this.loadingProspectus.set(false);
        if (response?.data) {
          this.prospectusList.set(response.data);
          console.log('Prospectus list fetched successfully:', response.data);
        } else {
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
        console.error('Failed to fetch prospectus list:', errorMessage);
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
    return (
      this.value.campus.trim().length > 0 &&
      this.value.campusFile !== null &&
      this.value.course.trim().length > 0 &&
      this.value.courseFile !== null
    );
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
