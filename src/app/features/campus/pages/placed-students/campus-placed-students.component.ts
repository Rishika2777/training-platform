import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, EventEmitter, inject, Input, OnInit, Output, signal, ViewChild } from '@angular/core';
import { Observable, map, catchError, of } from 'rxjs';
import { DropdownComponent, ApiFetchFunction, DropdownItem } from '../../../../shared/components/dropdown/dropdown.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { CampusApiService, StudentByCampusItem } from '../../services/campus-api.service';
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
  private readonly cdr = inject(ChangeDetectorRef);

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

  // Student name items - loaded via API autocomplete
  // Using API fetch function for real-time search from registered students
  loadingStudentNames = signal(false);

  // Map to store studentName -> studentId mapping for batch info lookup
  private studentNameToIdMap = new Map<string, string>();
  
  // Map to store full student objects for immediate access (includes batch/yearOfPassing)
  private studentNameToStudentMap = new Map<string, { studentId: string; firstName: string; lastName: string; batch?: string }>();
  
  // Loading state for batch info fetch
  loadingBatchInfo = signal(false);

  // Company name items - loaded via API autocomplete
  // Using API fetch function for real-time search from registered companies
  loadingCompanyNames = signal(false);

  ngOnInit(): void {
    this.loadCourses();
    this.loadBatches();
    this.loadDesignations();
    this.loadSectors();
  }

  /**
   * API fetch function for student names autocomplete
   * Fetches students by campus ID with search query
   * GET /student/campus/{campusId}?search={searchTerm}
   * 
   * Behavior:
   * - If search is empty or < 2 chars: Returns first 20 students
   * - If search has 2+ chars: Searches by firstName/lastName
   * - Stores studentName -> studentId mapping for batch info lookup
   */
  fetchStudentNames: ApiFetchFunction = (searchTerm: string): Observable<DropdownItem[]> => {
    this.loadingStudentNames.set(true);
    
    return this.campusApi.getStudentsByCampusId(searchTerm).pipe(
      map((response) => {
        if (response?.success && response.data?.content) {
          // Convert student objects to dropdown items
          // Combine firstName and lastName for display
          const dropdownItems: DropdownItem[] = response.data.content
            .filter(student => {
              // Filter out students without a name
              const firstName = student.firstName?.trim() || '';
              const lastName = student.lastName?.trim() || '';
              return firstName.length > 0 || lastName.length > 0;
            })
            .map(student => {
              const firstName = student.firstName?.trim() || '';
              const lastName = student.lastName?.trim() || '';
              const fullName = `${firstName} ${lastName}`.trim();
              
              // Store studentId mapping for batch info lookup
              // Use studentId if available, otherwise fallback to id or userId
              const studentId = student.studentId || student.id || student.userId;
              
              // Extract yearOfPassing from student data (check multiple possible fields)
              // The API response might have yearOfPassing directly, nested, or as array
              let yearOfPassing: string | undefined;
              
              // Check direct field - handle both string and array formats
              const studentWithYearOfPassing = student as StudentByCampusItem & { yearOfPassing?: string | string[] | unknown };
              const yearOfPassingValue = studentWithYearOfPassing.yearOfPassing;
              if (yearOfPassingValue) {
                if (typeof yearOfPassingValue === 'string') {
                  yearOfPassing = yearOfPassingValue.trim();
                } else if (Array.isArray(yearOfPassingValue)) {
                  const yearArray = yearOfPassingValue as string[];
                  if (yearArray.length > 0) {
                    yearOfPassing = String(yearArray[0]).trim();
                  }
                }
              }
              
              // Fallback to batch field
              if (!yearOfPassing && student.batch) {
                yearOfPassing = student.batch.trim();
              }
              
              // Log for debugging
              if (yearOfPassing) {
                console.log(`📝 Storing yearOfPassing "${yearOfPassing}" for student: ${fullName}`);
              } else {
                console.log(`⚠️ No yearOfPassing found for student: ${fullName}`, student);
              }
              
              if (studentId && fullName) {
                // Store with both exact case and lowercase for lookup
                this.studentNameToIdMap.set(fullName.toLowerCase(), studentId);
                this.studentNameToIdMap.set(fullName, studentId);
                
                // Also store full student object for immediate access (including yearOfPassing if available)
                if (yearOfPassing) {
                  this.studentNameToStudentMap.set(fullName.toLowerCase(), {
                    studentId: studentId,
                    firstName: firstName,
                    lastName: lastName,
                    batch: yearOfPassing
                  });
                  this.studentNameToStudentMap.set(fullName, {
                    studentId: studentId,
                    firstName: firstName,
                    lastName: lastName,
                    batch: yearOfPassing
                  });
                }
              }
              
              // Use full name as both label and value
              return {
                label: fullName,
                value: fullName,
              };
            })
            // Remove duplicates (in case of duplicate names)
            .filter((item, index, self) => 
              index === self.findIndex((t) => t.value.toLowerCase() === item.value.toLowerCase())
            );
          
          this.loadingStudentNames.set(false);
          return dropdownItems;
        }
        
        this.loadingStudentNames.set(false);
        return [];
      }),
      catchError(() => {
        this.loadingStudentNames.set(false);
        return of([]);
      })
    );
  };

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
    this.loadingBatches.set(true);
    
    this.campusApi.getBatchesForDropdown().subscribe({
      next: (batches) => {
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
        
        this.batchItems.set(batchDropdownItems);
        this.loadingBatches.set(false);
      },
      error: () => {
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


  /**
   * Public method to reload student names.
   * Note: Student names are now loaded via API autocomplete, so this method is kept for backward compatibility
   * but doesn't need to do anything since the dropdown handles fetching automatically.
   */
  reloadStudentNames(): void {
    // No-op: Student names are fetched automatically via API fetch function when user types
  }

  /**
   * API fetch function for company names autocomplete
   * Fetches companies by search term
   * GET /company/getCompanyBySearch?searchTerm={searchTerm}&page=0&size=20
   * 
   * Behavior:
   * - If search is empty: Returns first 20 companies
   * - If search has characters: Searches by companyName (case-insensitive partial match)
   * - Returns companyId, companyName, and companyAddress
   */
  fetchCompanyNames: ApiFetchFunction = (searchTerm: string): Observable<DropdownItem[]> => {
    this.loadingCompanyNames.set(true);
    
    return this.campusApi.getCompanyBySearch(searchTerm).pipe(
      map((response) => {
        if (response?.success && response.data && Array.isArray(response.data)) {
          // Convert company objects to dropdown items
          const dropdownItems: DropdownItem[] = response.data
            .filter(company => {
              // Filter out companies without a name
              return company.companyName && company.companyName.trim().length > 0;
            })
            .map(company => {
              const companyName = company.companyName.trim();
              
              // Use companyName as both label and value
              return {
                label: companyName,
                value: companyName,
              };
            })
            // Remove duplicates (in case of duplicate names)
            .filter((item, index, self) => 
              index === self.findIndex((t) => t.value.toLowerCase() === item.value.toLowerCase())
            );
          
          this.loadingCompanyNames.set(false);
          return dropdownItems;
        }
        
        this.loadingCompanyNames.set(false);
        return [];
      }),
      catchError((error) => {
        console.error('Error fetching companies:', error);
        this.loadingCompanyNames.set(false);
        return of([]);
      })
    );
  };

  patch(patch: Partial<PlacedStudentsFormValue>): void {
    const oldStudentName = this.value.studentName;
    const next: PlacedStudentsFormValue = { ...this.value, ...patch };
    this.value = next;
    this.valueChange.emit(next);
    
    // If student name changed, auto-fetch batch info from API
    if (patch.studentName !== undefined && patch.studentName !== oldStudentName && patch.studentName.trim().length > 0) {
      const newStudentName = patch.studentName.trim();
      
      // Clear batch field first when student changes
      if (newStudentName !== oldStudentName) {
        const clearedValue: PlacedStudentsFormValue = { ...this.value, batch: '' };
        this.value = clearedValue;
        this.valueChange.emit(clearedValue);
      }
      
      // Delay to ensure studentId map is populated from autocomplete fetch, then fetch batch from API
      // Increased delay to 300ms to ensure autocomplete fetch completes
      setTimeout(() => {
        console.log('🔄 Triggering batch fetch for student:', newStudentName);
        this.fetchBatchInfoForStudent(newStudentName);
      }, 300);
    }
  }
  
  /**
   * Fetch batch information for selected student and auto-populate batch field
   * ALWAYS calls the batch-info API to ensure we get the latest batch information
   */
  private fetchBatchInfoForStudent(studentName: string): void {
    if (!studentName || studentName.trim().length === 0) {
      console.warn('⚠️ Empty student name provided');
      return;
    }
    
    const trimmedName = studentName.trim();
    console.log('🔍 Fetching batch info for student:', trimmedName);
    
    // Get studentId from map (should be populated from autocomplete)
    let studentId = this.studentNameToIdMap.get(trimmedName.toLowerCase()) || 
                    this.studentNameToIdMap.get(trimmedName);
    
    if (!studentId) {
      // Try case-insensitive search through all keys
      for (const [key, value] of this.studentNameToIdMap.entries()) {
        if (key.toLowerCase() === trimmedName.toLowerCase()) {
          studentId = value;
          break;
        }
      }
    }
    
    // If studentId found in map, directly call batch-info API
    if (studentId) {
      console.log('✅ Found student ID in map, calling batch-info API:', studentId);
      this.fetchBatchInfoWithId(studentId);
      return;
    }
    
    // If studentId not in map, fetch student data first to get studentId
    console.log('⚠️ Student ID not found in map, fetching student data to get studentId...');
    this.campusApi.getStudentsByCampusId(trimmedName).subscribe({
      next: (response) => {
        console.log('📥 Student search response:', response);
        if (response?.success && response.data?.content) {
          const student = response.data.content.find(s => {
            const firstName = s.firstName?.trim() || '';
            const lastName = s.lastName?.trim() || '';
            const fullName = `${firstName} ${lastName}`.trim();
            return fullName.toLowerCase() === trimmedName.toLowerCase();
          });
          
          if (student) {
            const foundStudentId = student.studentId || student.id || student.userId;
            
            if (foundStudentId) {
              // Store studentId in map for future use
              this.studentNameToIdMap.set(trimmedName.toLowerCase(), foundStudentId);
              this.studentNameToIdMap.set(trimmedName, foundStudentId);
              
              // Now call the batch-info API with the studentId
              console.log('✅ Found studentId, calling batch-info API:', foundStudentId);
              this.fetchBatchInfoWithId(foundStudentId);
            } else {
              console.error('❌ Student found but no studentId available');
            }
          } else {
            console.error('❌ Student not found in API response for name:', trimmedName);
          }
        } else {
          console.error('❌ Invalid API response structure');
        }
      },
      error: (error) => {
        console.error('❌ Error fetching student data:', error);
      }
    });
  }
  
  /**
   * Helper method to fetch batch info using studentId
   * This will call GET /student/{studentId}/campus/{campusId}/batch-info
   * This API call should appear in the Network tab
   */
  private fetchBatchInfoWithId(studentId: string): void {
    if (!studentId || studentId.trim().length === 0) {
      console.error('❌ Invalid studentId provided:', studentId);
      return;
    }
    
    const trimmedStudentId = studentId.trim();
    console.log('📡 ========================================');
    console.log('📡 CALLING BATCH-INFO API');
    console.log('📡 Student ID:', trimmedStudentId);
    console.log('📡 Endpoint: GET /student/{studentId}/campus/{campusId}/batch-info');
    console.log('📡 ========================================');
    
    this.loadingBatchInfo.set(true);
    
    // Make the API call - this should appear in network tab
    this.campusApi.getStudentCampusBatchInfo(trimmedStudentId).subscribe({
      next: (response) => {
        this.loadingBatchInfo.set(false);
        console.log('📥 ========================================');
        console.log('📥 BATCH-INFO API RESPONSE RECEIVED');
        console.log('📥 Full response:', JSON.stringify(response, null, 2));
        console.log('📥 ========================================');
        
        if (response?.success && response.data?.batch) {
          const batch = response.data.batch.trim();
          console.log('✅ Auto-populating batch field with:', batch);
          
          // Ensure the batch value exists in batchItems dropdown
          // If not, add it to the items list so dropdown can display it
          const currentBatchItems = this.batchItems();
          const batchExists = currentBatchItems.some(item => item.value === batch);
          
          if (!batchExists && batch.length > 0) {
            console.log('📝 Adding batch to items list:', batch);
            const updatedBatchItems = [
              ...currentBatchItems,
              { label: batch, value: batch }
            ];
            this.batchItems.set(updatedBatchItems);
          }
          
          // Update batch field - patch only the batch to avoid triggering student name change again
          const updatedValue: PlacedStudentsFormValue = { 
            ...this.value, 
            batch: batch 
          };
          this.value = updatedValue;
          this.valueChange.emit(updatedValue);
          
          // Force change detection to ensure dropdown updates
          this.cdr.detectChanges();
        } else {
          console.warn('⚠️ Batch info response missing batch data');
          console.warn('⚠️ Response structure:', {
            hasResponse: !!response,
            hasSuccess: !!response?.success,
            hasData: !!response?.data,
            hasBatch: !!response?.data?.batch,
            fullResponse: response
          });
        }
      },
      error: (error) => {
        this.loadingBatchInfo.set(false);
        console.error('❌ ========================================');
        console.error('❌ ERROR FETCHING BATCH INFO');
        console.error('❌ Error object:', error);
        console.error('❌ Error message:', error?.message);
        console.error('❌ Error status:', error?.status);
        console.error('❌ Error URL:', error?.url);
        console.error('❌ Full error:', JSON.stringify(error, null, 2));
        console.error('❌ ========================================');
      }
    });
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

  /**
   * Reset form to initial empty state
   * Called when modal opens or after successful submit
   */
  resetForm(): void {
    const emptyValue: PlacedStudentsFormValue = {
      studentName: '',
      studentPhoto: null,
      course: '',
      batch: '',
      placementCompany: '',
      designation: '',
      sector: '',
    };
    
    this.value = emptyValue;
    this.valueChange.emit(emptyValue);
    
    // Clear file input if it exists
    if (this.studentPhotoFileInput?.nativeElement) {
      this.studentPhotoFileInput.nativeElement.value = '';
    }
    
    // Clear student maps to ensure fresh data on next open
    this.studentNameToIdMap.clear();
    this.studentNameToStudentMap.clear();
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

