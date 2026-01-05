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

  readonly courseItems = [
    { label: 'BCA', value: 'bca' },
    { label: 'MCA', value: 'mca' },
    { label: 'B.Tech', value: 'btech' },
  ] as const;

  readonly batchItems = [
    { label: '2024', value: '2024' },
    { label: '2023', value: '2023' },
    { label: '2022', value: '2022' },
  ] as const;

  readonly designationItems = [
    { label: 'Software Engineer', value: 'software-engineer' },
    { label: 'Senior Developer', value: 'senior-developer' },
    { label: 'Tech Lead', value: 'tech-lead' },
  ] as const;

  // Sector items - loaded from API (GET /dashboard/meta/sectors)
  // API returns: { success: true, data: ["Consulting", "Finance", "IT Services", "Product Companies"], error: null }
  readonly sectorItems = signal<readonly { label: string; value: string }[]>([]);
  loadingSectors = signal(false);

  ngOnInit(): void {
    console.log('CampusPlacedStudentsComponent: Component initialized, fetching sectors from API...');
    this.loadSectors();
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

