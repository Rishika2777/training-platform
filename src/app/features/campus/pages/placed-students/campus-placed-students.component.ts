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
    console.log('CampusPlacedStudentsComponent: Component initialized, fetching courses, batches, designations and sectors from API...');
    this.loadCourses();
    this.loadBatches();
    this.loadDesignations();
    this.loadSectors();
  }

  /**
   * Load courses from API
   * GET /dashboard/meta/courses
   * Response: { success: true, data: string[], error: null }
   * 
   * IMPORTANT: Courses are ONLY loaded from backend API, no static/hardcoded values
   */
  loadCourses(): void {
    console.log('CampusPlacedStudentsComponent: ========== LOADING COURSES FROM API ==========');
    console.log('CampusPlacedStudentsComponent: API Endpoint: GET /dashboard/meta/courses');
    console.log('CampusPlacedStudentsComponent: This will fetch courses from backend');
    
    this.loadingCourses.set(true);
    
    this.campusApi.getCoursesForDropdown().subscribe({
      next: (courses) => {
        console.log('CampusPlacedStudentsComponent: ✅✅✅ COURSES API SUCCESS ✅✅✅');
        console.log('CampusPlacedStudentsComponent: Raw courses array from API:', courses);
        console.log('CampusPlacedStudentsComponent: Courses count:', courses.length);
        console.log('CampusPlacedStudentsComponent: Courses received:', JSON.stringify(courses, null, 2));
        
        // Convert string array to dropdown items format: { label: string, value: string }
        // API returns: ["BCA", "MCA", "B.Tech", ...]
        const courseDropdownItems = courses
          .filter(course => course && typeof course === 'string' && course.trim() !== '' && course !== 'string')
          .map(course => ({
            label: course.trim(),
            value: course.trim(), // Use the same value as label (e.g., "BCA", "MCA", "B.Tech")
          }));
        
        console.log('CampusPlacedStudentsComponent: Converted to dropdown items format:');
        console.log('CampusPlacedStudentsComponent: Dropdown items:', JSON.stringify(courseDropdownItems, null, 2));
        
        if (courseDropdownItems.length > 0) {
          this.courseItems.set(courseDropdownItems);
          console.log('CampusPlacedStudentsComponent: ✅ Courses loaded successfully from API:', courseDropdownItems.length, 'items');
          console.log('CampusPlacedStudentsComponent: Course dropdown will now show:', courseDropdownItems.map(c => c.label).join(', '));
        } else {
          console.warn('CampusPlacedStudentsComponent: ⚠️ No valid courses found in API response');
          console.warn('CampusPlacedStudentsComponent: Course dropdown will be empty');
          this.courseItems.set([]);
        }
        
        this.loadingCourses.set(false);
      },
      error: (err) => {
        console.error('CampusPlacedStudentsComponent: ❌❌❌ ERROR LOADING COURSES FROM API ❌❌❌');
        console.error('CampusPlacedStudentsComponent: Error status:', err?.status);
        console.error('CampusPlacedStudentsComponent: Error URL:', err?.url);
        console.error('CampusPlacedStudentsComponent: Error message:', err?.message);
        console.error('CampusPlacedStudentsComponent: Error response:', err?.error);
        console.error('CampusPlacedStudentsComponent: ⚠️ Course dropdown will be empty - API call failed');
        
        // Set empty array - no fallback values
        this.courseItems.set([]);
        this.loadingCourses.set(false);
        
        // Show error notification to user
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
    console.log('CampusPlacedStudentsComponent: ========== LOADING BATCHES FROM API ==========');
    console.log('CampusPlacedStudentsComponent: API Endpoint: GET /dashboard/meta/batches');
    console.log('CampusPlacedStudentsComponent: This will fetch batches from backend');
    
    this.loadingBatches.set(true);
    
    this.campusApi.getBatchesForDropdown().subscribe({
      next: (batches) => {
        console.log('CampusPlacedStudentsComponent: ✅✅✅ BATCHES API SUCCESS ✅✅✅');
        console.log('CampusPlacedStudentsComponent: Raw batches array from API:', batches);
        console.log('CampusPlacedStudentsComponent: Batches count:', batches.length);
        console.log('CampusPlacedStudentsComponent: Batches received:', JSON.stringify(batches, null, 2));
        
        // Convert string array to dropdown items format: { label: string, value: string }
        // API returns: ["2023", "2024", ...]
        const batchDropdownItems = batches
          .filter(batch => batch && typeof batch === 'string' && batch.trim() !== '' && batch !== 'string')
          .map(batch => ({
            label: batch.trim(),
            value: batch.trim(), // Use the same value as label (e.g., "2023", "2024")
          }));
        
        console.log('CampusPlacedStudentsComponent: Converted to dropdown items format:');
        console.log('CampusPlacedStudentsComponent: Dropdown items:', JSON.stringify(batchDropdownItems, null, 2));
        
        if (batchDropdownItems.length > 0) {
          this.batchItems.set(batchDropdownItems);
          console.log('CampusPlacedStudentsComponent: ✅ Batches loaded successfully from API:', batchDropdownItems.length, 'items');
          console.log('CampusPlacedStudentsComponent: Batch dropdown will now show:', batchDropdownItems.map(b => b.label).join(', '));
        } else {
          console.warn('CampusPlacedStudentsComponent: ⚠️ No valid batches found in API response');
          console.warn('CampusPlacedStudentsComponent: Batch dropdown will be empty');
          this.batchItems.set([]);
        }
        
        this.loadingBatches.set(false);
      },
      error: (err) => {
        console.error('CampusPlacedStudentsComponent: ❌❌❌ ERROR LOADING BATCHES FROM API ❌❌❌');
        console.error('CampusPlacedStudentsComponent: Error status:', err?.status);
        console.error('CampusPlacedStudentsComponent: Error URL:', err?.url);
        console.error('CampusPlacedStudentsComponent: Error message:', err?.message);
        console.error('CampusPlacedStudentsComponent: Error response:', err?.error);
        console.error('CampusPlacedStudentsComponent: ⚠️ Batch dropdown will be empty - API call failed');
        
        // Set empty array - no fallback values
        this.batchItems.set([]);
        this.loadingBatches.set(false);
        
        // Show error notification to user
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
    console.log('CampusPlacedStudentsComponent: ========== LOADING DESIGNATIONS FROM API ==========');
    console.log('CampusPlacedStudentsComponent: API Endpoint: GET /dashboard/meta/designations');
    console.log('CampusPlacedStudentsComponent: This will fetch designations from backend');
    
    this.loadingDesignations.set(true);
    
    this.campusApi.getDesignations().subscribe({
      next: (designations) => {
        console.log('CampusPlacedStudentsComponent: ✅✅✅ DESIGNATIONS API SUCCESS ✅✅✅');
        console.log('CampusPlacedStudentsComponent: Raw designations array from API:', designations);
        console.log('CampusPlacedStudentsComponent: Designations count:', designations.length);
        console.log('CampusPlacedStudentsComponent: Designations received:', JSON.stringify(designations, null, 2));
        
        // Convert string array to dropdown items format: { label: string, value: string }
        // API returns: ["Software Engineer", "Software Developer", "Full Stack Developer", ...]
        const designationDropdownItems = designations
          .filter(designation => designation && typeof designation === 'string' && designation.trim() !== '' && designation !== 'string')
          .map(designation => ({
            label: designation.trim(),
            value: designation.trim(), // Use the same value as label (e.g., "Software Engineer", "Software Developer")
          }));
        
        console.log('CampusPlacedStudentsComponent: Converted to dropdown items format:');
        console.log('CampusPlacedStudentsComponent: Dropdown items:', JSON.stringify(designationDropdownItems, null, 2));
        
        if (designationDropdownItems.length > 0) {
          this.designationItems.set(designationDropdownItems);
          console.log('CampusPlacedStudentsComponent: ✅ Designations loaded successfully from API:', designationDropdownItems.length, 'items');
          console.log('CampusPlacedStudentsComponent: Designation dropdown will now show:', designationDropdownItems.map(d => d.label).join(', '));
        } else {
          console.warn('CampusPlacedStudentsComponent: ⚠️ No valid designations found in API response');
          console.warn('CampusPlacedStudentsComponent: Designation dropdown will be empty');
          this.designationItems.set([]);
        }
        
        this.loadingDesignations.set(false);
      },
      error: (err) => {
        console.error('CampusPlacedStudentsComponent: ❌❌❌ ERROR LOADING DESIGNATIONS FROM API ❌❌❌');
        console.error('CampusPlacedStudentsComponent: Error status:', err?.status);
        console.error('CampusPlacedStudentsComponent: Error URL:', err?.url);
        console.error('CampusPlacedStudentsComponent: Error message:', err?.message);
        console.error('CampusPlacedStudentsComponent: Error response:', err?.error);
        console.error('CampusPlacedStudentsComponent: ⚠️ Designation dropdown will be empty - API call failed');
        
        // Set empty array - no fallback values
        this.designationItems.set([]);
        this.loadingDesignations.set(false);
        
        // Show error notification to user
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
    console.log('CampusPlacedStudentsComponent: ========== LOADING SECTORS FROM API ==========');
    console.log('CampusPlacedStudentsComponent: API Endpoint: GET /dashboard/meta/sectors');
    console.log('CampusPlacedStudentsComponent: This will fetch sectors from backend');
    
    this.loadingSectors.set(true);
    
    this.campusApi.getSectors().subscribe({
      next: (sectors) => {
        console.log('CampusPlacedStudentsComponent: ✅✅✅ SECTORS API SUCCESS ✅✅✅');
        console.log('CampusPlacedStudentsComponent: Raw sectors array from API:', sectors);
        console.log('CampusPlacedStudentsComponent: Sectors count:', sectors.length);
        console.log('CampusPlacedStudentsComponent: Sectors received:', JSON.stringify(sectors, null, 2));
        
        // Convert string array to dropdown items format: { label: string, value: string }
        // API returns: ["Consulting", "Finance", "IT Services", "Product Companies"]
        const sectorDropdownItems = sectors
          .filter(sector => sector && typeof sector === 'string' && sector.trim() !== '' && sector !== 'string')
          .map(sector => ({
            label: sector.trim(),
            value: sector.trim(), // Use the same value as label (e.g., "Finance", "IT Services", "Consulting")
          }));
        
        console.log('CampusPlacedStudentsComponent: Converted to dropdown items format:');
        console.log('CampusPlacedStudentsComponent: Dropdown items:', JSON.stringify(sectorDropdownItems, null, 2));
        
        if (sectorDropdownItems.length > 0) {
          this.sectorItems.set(sectorDropdownItems);
          console.log('CampusPlacedStudentsComponent: ✅ Sectors loaded successfully from API:', sectorDropdownItems.length, 'items');
          console.log('CampusPlacedStudentsComponent: Sector dropdown will now show:', sectorDropdownItems.map(s => s.label).join(', '));
        } else {
          console.warn('CampusPlacedStudentsComponent: ⚠️ No valid sectors found in API response');
          console.warn('CampusPlacedStudentsComponent: Sector dropdown will be empty');
          this.sectorItems.set([]);
        }
        
        this.loadingSectors.set(false);
      },
      error: (err) => {
        console.error('CampusPlacedStudentsComponent: ❌❌❌ ERROR LOADING SECTORS FROM API ❌❌❌');
        console.error('CampusPlacedStudentsComponent: Error status:', err?.status);
        console.error('CampusPlacedStudentsComponent: Error URL:', err?.url);
        console.error('CampusPlacedStudentsComponent: Error message:', err?.message);
        console.error('CampusPlacedStudentsComponent: Error response:', err?.error);
        console.error('CampusPlacedStudentsComponent: ⚠️ Sector dropdown will be empty - API call failed');
        
        // Set empty array - no fallback values
        this.sectorItems.set([]);
        this.loadingSectors.set(false);
        
        // Show error notification to user
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
    console.log('=== BUTTON CLICKED DIRECTLY ===');
    console.log('Submitting flag:', this.submitting);
    console.log('Current form value:', this.value);
    this.submit();
  }

  onFormSubmit(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    console.log('Form ngSubmit triggered - onFormSubmit called');
    console.log('Submitting flag:', this.submitting);
    console.log('Current form value:', this.value);
    this.submit();
  }

  submit(): void {
    console.log('=== CampusPlacedStudentsComponent.submit() called ===');
    console.log('Emitting submitted event with value:', this.value);
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

