import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, inject, Input, OnInit, Output, signal, ViewChild } from '@angular/core';
import { DropdownComponent } from '../../../../shared/components/dropdown/dropdown.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { CampusApiService } from '../../services/campus-api.service';
import { NotificationService } from '../../../../core/notifications/notification.service';

export interface PlacedStudentsFormValue {
  studentName: string;
  studentPhoto: File | null;
  course: string;
  batch: string;
  placementCompany: string;
  designation: string;
  sector: string;
}

@Component({
  selector: 'app-campus-placed-students',
  standalone: true,
  imports: [CommonModule, DropdownComponent, InputComponent],
  templateUrl: './campus-placed-students.component.html',
  styleUrl: './campus-placed-students.component.css',
})
export class CampusPlacedStudentsComponent implements OnInit {
  private readonly campusApi = inject(CampusApiService);
  private readonly notify = inject(NotificationService);

  @ViewChild('studentPhotoFileInput') studentPhotoFileInput!: ElementRef<HTMLInputElement>;

  @Input() submitting = false;
  @Input() value: PlacedStudentsFormValue = {
    studentName: '',
    studentPhoto: null,
    course: '',
    batch: '',
    placementCompany: '',
    designation: '',
    sector: '',
  };

  @Output() valueChange = new EventEmitter<PlacedStudentsFormValue>();
  @Output() submitted = new EventEmitter<PlacedStudentsFormValue>();

  // Course items - loaded from API (GET /dashboard/meta/courses)
  // API returns: { success: true, data: string[], error: null }
  readonly courseItems = signal<readonly { label: string; value: string }[]>([]);
  loadingCourses = signal(false);

  // Batch items - loaded from API (GET /dashboard/meta/batches)
  // API returns: { success: true, data: string[], error: null }
  readonly batchItems = signal<readonly { label: string; value: string }[]>([]);
  loadingBatches = signal(false);

  // Designation items - loaded from API (GET /dashboard/meta/designations)
  // API returns: { success: true, data: ["Software Engineer", "Software Developer", ...], error: null }
  readonly designationItems = signal<readonly { label: string; value: string }[]>([]);
  loadingDesignations = signal(false);

  // Sector items - loaded from API (GET /dashboard/meta/sectors)
  // API returns: { success: true, data: ["Consulting", "Finance", "IT Services", "Product Companies"], error: null }
  readonly sectorItems = signal<readonly { label: string; value: string }[]>([]);
  loadingSectors = signal(false);

  ngOnInit(): void {
    this.loadCourses();
    this.loadBatches();
    this.loadDesignations();
    this.loadSectors();
  }

  /**
   * Public method to reload courses.
   * Can be called when modal opens to ensure fresh data.
   */
  reloadCourses(): void {
    this.loadCourses();
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
        this.loadingCourses.set(false);
        this.notify.error('Failed to load courses. Please refresh the page or contact support.');
      },
    });
  }

  /**
   * Load batches from API
   * GET /dashboard/meta/batches
   * 
   */
  loadBatches(): void {
    console.log('CampusPlacedStudentsComponent: loadBatches called');
    this.loadingBatches.set(true);
    
    this.campusApi.getBatchesForDropdown().subscribe({
      next: (batches) => {
        console.log('CampusPlacedStudentsComponent: Raw batches response:', batches);
        console.log('CampusPlacedStudentsComponent: Batches type:', typeof batches);
        console.log('CampusPlacedStudentsComponent: Is array?', Array.isArray(batches));
        console.log('CampusPlacedStudentsComponent: Batches length:', Array.isArray(batches) ? batches.length : 'N/A');
        
        // Convert string array to dropdown items format: { label: string, value: string }
        // API returns: ["2023", "2024", ...]
        const batchDropdownItems = Array.isArray(batches)
          ? batches
              .filter(batch => batch && typeof batch === 'string' && batch.trim() !== '' && batch !== 'string')
              .map(batch => ({
                label: batch.trim(),
                value: batch.trim(), // Use the same value as label (e.g., "2023", "2024")
              }))
          : [];
        
        console.log('CampusPlacedStudentsComponent: Processed batch items:', batchDropdownItems);
        console.log('CampusPlacedStudentsComponent: Batch items count:', batchDropdownItems.length);
        
        // Always set the items, even if empty array
        this.batchItems.set(batchDropdownItems);
        
        this.loadingBatches.set(false);
        
        if (batchDropdownItems.length === 0) {
          console.warn('CampusPlacedStudentsComponent: No batches found after processing. Raw data:', batches);
        }
      },
      error: (error) => {
        console.error('CampusPlacedStudentsComponent: Failed to load batches:', error);
        console.error('CampusPlacedStudentsComponent: Error details:', {
          status: error?.status,
          statusText: error?.statusText,
          message: error?.message,
          error: error?.error
        });
        this.batchItems.set([]);
        this.loadingBatches.set(false);
        this.notify.error('Failed to load batches. Please refresh the page or contact support.');
      },
    });
  }

  /**
   * Load designations from API
   * GET /dashboard/meta/designations
   * Response: { success: true, data: ["Software Engineer", "Software Developer", ...], error: null }
   * 
   * IMPORTANT: Designations are ONLY loaded from backend API, no static/hardcoded values
   */
  loadDesignations(): void {
    this.loadingDesignations.set(true);
    
    this.campusApi.getDesignations().subscribe({
      next: (designations) => {
        // Convert string array to dropdown items format: { label: string, value: string }
        // API returns: ["Software Engineer", "Software Developer", "Full Stack Developer", ...]
        const designationDropdownItems = designations
          .filter(designation => designation && typeof designation === 'string' && designation.trim() !== '' && designation !== 'string')
          .map(designation => ({
            label: designation.trim(),
            value: designation.trim(), // Use the same value as label (e.g., "Software Engineer", "Software Developer")
          }));
        
        if (designationDropdownItems.length > 0) {
          this.designationItems.set(designationDropdownItems);
        } else {
          this.designationItems.set([]);
        }
        
        this.loadingDesignations.set(false);
      },
      error: () => {
        this.designationItems.set([]);
        this.loadingDesignations.set(false);
        this.notify.error('Failed to load designations. Please refresh the page or contact support.');
      },
    });
  }

  /**
   * Load sectors from API
   * GET /dashboard/meta/sectors
   * Response: { success: true, data: ["Consulting", "Finance", "IT Services", "Product Companies"], error: null }
   * 
   * IMPORTANT: Sectors are ONLY loaded from backend API, no static/hardcoded values
   */
  loadSectors(): void {
    this.loadingSectors.set(true);
    
    this.campusApi.getSectors().subscribe({
      next: (sectors) => {
        // Convert string array to dropdown items format: { label: string, value: string }
        // API returns: ["Consulting", "Finance", "IT Services", "Product Companies"]
        const sectorDropdownItems = sectors
          .filter(sector => sector && typeof sector === 'string' && sector.trim() !== '' && sector !== 'string')
          .map(sector => ({
            label: sector.trim(),
            value: sector.trim(), // Use the same value as label (e.g., "Finance", "IT Services", "Consulting")
          }));
        
        if (sectorDropdownItems.length > 0) {
          this.sectorItems.set(sectorDropdownItems);
        } else {
          this.sectorItems.set([]);
        }
        
        this.loadingSectors.set(false);
      },
      error: () => {
        this.sectorItems.set([]);
        this.loadingSectors.set(false);
        this.notify.error('Failed to load sectors. Please refresh the page or contact support.');
      },
    });
  }

  patch(patch: Partial<PlacedStudentsFormValue>): void {
    const next: PlacedStudentsFormValue = { ...this.value, ...patch };
    this.value = next;
    this.valueChange.emit(next);
  }

  triggerStudentPhotoSelect(): void {
    this.studentPhotoFileInput?.nativeElement?.click();
  }

  onStudentPhotoSelected(files: FileList | null): void {
    const file = files && files.length > 0 ? files.item(0) : null;
    this.patch({ studentPhoto: file });
  }

  get studentPhotoName(): string {
    return this.value.studentPhoto?.name ?? '';
  }

  onButtonClickDirect(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.submit();
  }

  onFormSubmit(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.submit();
  }

  submit(): void {
    this.submitted.emit(this.value);
  }

  private isFormValid(): boolean {
    return (
      this.value.studentName.trim().length > 0 &&
      this.value.studentPhoto !== null &&
      this.value.course.trim().length > 0 &&
      this.value.batch.trim().length > 0 &&
      this.value.placementCompany.trim().length > 0 &&
      this.value.designation.trim().length > 0 &&
      this.value.sector.trim().length > 0
    );
  }
}

