import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CarouselComponent } from '../../../../shared/components/carousel/carousel.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { CampusProspectusComponent, ProspectusUploadFormValue } from '../upload-prospectus/campus-prospectus.component';
import {
  CampusCompaniesVisitedComponent,
  CompaniesVisitedFormValue,
} from '../companies-visited/campus-companies-visited.component';
import { CampusPlacedStudentsComponent, PlacedStudentsFormValue } from '../placed-students/campus-placed-students.component';
import { CampusCoursesComponent } from '../courses/campus-courses.component';
import { CampusFacultyComponent, FacultyFormValue } from '../faculty/campus-faculty.component';
import { CampusCourseFormComponent, CourseFormValue } from '../course-form/course-form.component';
import { CampusFacultyDetailComponent } from '../faculty-detail/campus-faculty-detail.component';
import { ModalService } from '../../../../core/modal/modal.service';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { CampusApiService } from '../../services/campus-api.service';
import { FacultyDetailService } from '../../services/faculty-detail.service';
import { StudentApiService } from '../../../student/services/student-api.service';
import { AuthStateService } from '../../../../core/auth/auth-state.service';
import { API_ENDPOINTS } from '../../../../core/config/app.constants';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-campus-home',
  standalone: true,
  imports: [
    CommonModule,
    CarouselComponent,
    ModalComponent,
    CampusProspectusComponent,
    CampusCompaniesVisitedComponent,
    CampusPlacedStudentsComponent,
    CampusCoursesComponent,
    CampusFacultyComponent,
    CampusCourseFormComponent,
    CampusFacultyDetailComponent,
  ],
  templateUrl: './campus-home.component.html',
  styleUrl: './campus-home.component.css',
})
export class CampusHomeComponent implements OnInit {
  readonly modalService = inject(ModalService);
  private readonly campusApi = inject(CampusApiService);
  private readonly studentApiService = inject(StudentApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly notify = inject(NotificationService);
  private readonly facultyDetailService = inject(FacultyDetailService);
  private readonly authState = inject(AuthStateService);
  
  readonly activeModal = computed(() => this.modalService.activeModal());
  readonly isProspectusModalOpen = computed(() => this.activeModal() === 'prospectus-upload');
  readonly isCompaniesModalOpen = computed(() => this.activeModal() === 'companies-visited');
  readonly isPlacedStudentsModalOpen = computed(() => this.activeModal() === 'placed-students');
  readonly isCoursesModalOpen = computed(() => this.activeModal() === 'courses');
  readonly isFacultyModalOpen = computed(() => this.activeModal() === 'faculty');
  readonly isFacultyDetailModalOpen = computed(() => this.activeModal() === 'faculty-detail');
  readonly isCourseFormModalOpen = computed(() => this.activeModal() === 'course-form');
  readonly selectedFaculty = computed(() => this.facultyDetailService.selectedFaculty());

  submittingProspectus = false;
  submittingCompanies = false;
  submittingPlacedStudents = false;
  submittingFaculty = false;
  submittingCourseForm = false;
  readonly announcementDate = 'January 7th, 2025';

  readonly currentBatch: readonly PersonCard[] = [
    { name: 'Name(Cs)', subtitle: 'Name(Cs)', imageUrl: 'assets/images/login-news-image.png' },
    { name: 'Name(Cs)', subtitle: 'Name(Cs)', imageUrl: 'assets/images/landing-card-campus.png' },
    { name: 'Name(Cs)', subtitle: 'Name(Cs)', imageUrl: 'assets/images/landing-card-company.png' },
    { name: 'Name(Cs)', subtitle: 'Name(Cs)', imageUrl: 'assets/images/landing-card-institution.png' },
    { name: 'Name(Cs)', subtitle: 'Name(Cs)', imageUrl: 'assets/images/login-hero-image.png' },
  ];

  readonly placedStudents = signal<readonly PersonCard[]>([]);
  loadingPlacedStudents = signal(false);

  readonly alumni: readonly PersonCard[] = [
    { name: 'Name', subtitle: 'Designation Company', imageUrl: 'assets/images/login-news-image.png' },
    { name: 'Name', subtitle: 'Designation Company', imageUrl: 'assets/images/landing-card-campus.png' },
    { name: 'Name', subtitle: 'Designation Company', imageUrl: 'assets/images/landing-card-company.png' },
    { name: 'Name', subtitle: 'Designation Company', imageUrl: 'assets/images/landing-card-institution.png' },
  ];

  readonly posts: readonly FeedPost[] = [
    {
      author: 'Ankitha Wilson',
      authorId: '1d',
      imageUrl: 'assets/images/landing-card-institution.png',
      text:
        'Campus life isn’t just about lectures and exams—it’s about growth, friendships, and unforgettable experiences! From engaging classroom discussions to late-night study sessions, from club activities to spontaneous hangouts, every moment shapes who we become.',
    },
    {
      author: 'Ankitha Wilson',
      authorId: '1d',
      imageUrl: 'assets/images/landing-card-campus.png',
      text:
        'Campus life isn’t just about lectures and exams—it’s about growth, friendships, and unforgettable experiences! From engaging classroom discussions to late-night study sessions, from club activities to spontaneous hangouts, every moment shapes who we become.',
    },
  ];

  readonly companiesVisitedSlots = 3;

  // Carousel / pagination state (shared component usage)
  readonly peoplePageSize = 6;
  currentBatchPage = 1;
  placedStudentsPage = 1;
  alumniPage = 1;

  get currentBatchTotalPages(): number {
    return totalPages(this.currentBatch.length, this.peoplePageSize);
  }

  placedStudentsTotalPages = signal(1);

  get alumniTotalPages(): number {
    return totalPages(this.alumni.length, this.peoplePageSize);
  }

  currentBatchPageItems(): readonly PersonCard[] {
    return slicePage(this.currentBatch, this.currentBatchPage, this.peoplePageSize);
  }

  placedStudentsPageItems(): readonly PersonCard[] {
    return slicePage(this.placedStudents(), this.placedStudentsPage, this.peoplePageSize);
  }

  ngOnInit(): void {
    this.loadPlacedStudents();
  }

  loadPlacedStudents(): void {
    console.log('CampusHomeComponent: ========== LOADING PLACED STUDENTS ==========');
    console.log('CampusHomeComponent: Current page:', this.placedStudentsPage);
    console.log('CampusHomeComponent: Page size:', this.peoplePageSize);
    this.loadingPlacedStudents.set(true);
    this.studentApiService
      .getPlacedStudents(this.placedStudentsPage, this.peoplePageSize)
      .pipe(
        catchError((error) => {
          console.error('CampusHomeComponent: ❌ Error loading placed students:', error);
          console.error('CampusHomeComponent: Error status:', error?.status);
          console.error('CampusHomeComponent: Error URL:', error?.url);
          this.loadingPlacedStudents.set(false);
          return of(null);
        }),
      )
      .subscribe({
        next: (response) => {
          console.log('CampusHomeComponent: ✅ GET PLACED STUDENTS API RESPONSE RECEIVED');
          console.log('CampusHomeComponent: Response:', response);
          console.log('CampusHomeComponent: Response success:', response?.success);
          console.log('CampusHomeComponent: Response data:', response?.data);
          console.log('CampusHomeComponent: Response content array:', response?.data?.content);
          console.log('CampusHomeComponent: Content length:', response?.data?.content?.length || 0);
          
          this.loadingPlacedStudents.set(false);
          if (response?.success && response.data) {
            console.log('CampusHomeComponent: ✅ Response is successful and has data');
            console.log('CampusHomeComponent: Total pages:', response.data.totalPages);
            console.log('CampusHomeComponent: Total elements:', response.data.totalElements);
            
            const rawItems = response.data.content || [];
            console.log('CampusHomeComponent: Raw items before mapping:', rawItems);
            console.log('CampusHomeComponent: Raw items count:', rawItems.length);
            
            const items = rawItems.map((item) => {
              console.log('CampusHomeComponent: Mapping item:', item);
              return this.mapPlacedStudentToPersonCard(item);
            });
            
            console.log('CampusHomeComponent: Mapped items:', items);
            console.log('CampusHomeComponent: Mapped items count:', items.length);
            
            this.placedStudents.set(items);
            this.placedStudentsTotalPages.set(response.data.totalPages || 1);
            
            console.log('CampusHomeComponent: ✅ Placed students list updated');
            console.log('CampusHomeComponent: Current placed students signal:', this.placedStudents());
          } else {
            console.warn('CampusHomeComponent: ⚠️ Response not successful or no data');
            console.warn('CampusHomeComponent: Response success:', response?.success);
            console.warn('CampusHomeComponent: Response data exists:', !!response?.data);
          }
        },
        error: (error) => {
          console.error('CampusHomeComponent: ❌ Placed students subscription error:', error);
          this.loadingPlacedStudents.set(false);
        },
      });
  }

  onPlacedStudentsPageChange(page: number): void {
    this.placedStudentsPage = page;
    this.loadPlacedStudents();
  }

  private mapPlacedStudentToPersonCard(item: {
    firstName?: string;
    lastName?: string;
    studentName?: string;
    profilePhotoUrl?: string;
    batch?: string;
    companyName?: string;
    placementCompanyId?: string;
    designation?: string;
  }): PersonCard {
    // Use studentName if available, otherwise fall back to firstName + lastName
    const name = item.studentName || [item.firstName, item.lastName].filter(Boolean).join(' ') || 'Unknown';
    // Try companyName first, then placementCompanyId as fallback
    const company = item.companyName || item.placementCompanyId || '';
    const subtitle = [item.batch, company].filter(Boolean).join(' ') || '';
    const result = {
      name,
      subtitle,
      imageUrl: item.profilePhotoUrl || 'assets/images/login-news-image.png',
    };
    console.log('CampusHomeComponent: Mapped item to PersonCard:', {
      original: { studentName: item.studentName, companyName: item.companyName, placementCompanyId: item.placementCompanyId, batch: item.batch },
      mapped: result
    });
    return result;
  }

  alumniPageItems(): readonly PersonCard[] {
    return slicePage(this.alumni, this.alumniPage, this.peoplePageSize);
  }

  closeModal(): void {
    this.modalService.closeModal();
    this.facultyDetailService.clearSelectedFaculty();
  }

  handleFacultyDetailClose(): void {
    this.closeModal();
  }

  handleProspectusUploadSuccess(): void {
    this.closeModal();
  }

  handleProspectusSubmit(value: ProspectusUploadFormValue): void {
    // Prospectus submission is handled by the prospectus component itself
    // This handler is just for the event binding
    console.log('CampusHomeComponent: Prospectus submit event received:', value);
  }

  handleCompaniesSubmit(value: CompaniesVisitedFormValue): void {
    if (!value.companyLogo || !value.companyName.trim()) {
      this.submittingCompanies = false;
      return;
    }

    this.submittingCompanies = true;

    // Convert file to base64
    this.convertFileToBase64(value.companyLogo)
      .then((base64Logo) => {
        const request = {
          companyLogo: base64Logo,
          companyName: value.companyName.trim(),
        };

        this.campusApi.addCompanyVisited(request).subscribe({
          next: () => {
            console.log('API Integration Working - Company Visited Added Successfully');
            this.submittingCompanies = false;
            this.notify.success('Company visited added successfully');
            this.closeModal();
            try {
              this.cdr.detectChanges();
            } catch {
              // Component might be destroyed, ignore
            }
          },
          error: (err) => {
            const errorMessage = err?.error?.message || err?.message || 'Failed to add company visited';
            console.error('API Integration Failed -', errorMessage);
            this.submittingCompanies = false;
            this.notify.error(errorMessage);
            try {
              this.cdr.detectChanges();
            } catch {
              // Ignore
            }
          },
        });
      })
      .catch(() => {
        console.error('API Integration Failed - Error converting file to base64');
        setTimeout(() => {
          this.submittingCompanies = false;
          this.cdr.detectChanges();
        }, 0);
      });
  }

  handlePlacedStudentsSubmit(value: PlacedStudentsFormValue): void {
    console.log('CampusHomeComponent: ========== PLACED STUDENTS SUBMIT CALLED ==========');
    console.log('CampusHomeComponent: Form value:', {
      studentName: value.studentName,
      course: value.course,
      batch: value.batch,
      placementCompany: value.placementCompany,
      designation: value.designation,
      sector: value.sector,
      hasPhoto: !!value.studentPhoto,
      photoName: value.studentPhoto?.name || 'null'
    });
    
    this.submittingPlacedStudents = true;

    // Convert File to base64 string
    this.convertFileToBase64(value.studentPhoto)
      .then((photoBase64) => {
        console.log('CampusHomeComponent: ✅ File conversion completed');
        console.log('CampusHomeComponent: Photo base64 length:', photoBase64?.length || 0);
        
        const request = {
          studentName: value.studentName,
          photo: photoBase64 || '',
          courseId: value.course,
          batch: value.batch,
          placementCompanyId: value.placementCompany,
          designation: value.designation,
          sector: value.sector,
        };

        console.log('CampusHomeComponent: ========== CALLING ADD PLACED STUDENT API ==========');
        console.log('CampusHomeComponent: Request payload:', {
          studentName: request.studentName,
          courseId: request.courseId,
          batch: request.batch,
          placementCompanyId: request.placementCompanyId,
          designation: request.designation,
          sector: request.sector,
          photoLength: request.photo.length
        });
        console.log('CampusHomeComponent: ⚠️ This should appear in Network tab as POST /dashboard/students/placed');

        this.campusApi.addPlacedStudent(request).subscribe({
          next: (response) => {
            console.log('CampusHomeComponent: ✅✅✅ ADD PLACED STUDENT API SUCCESS ✅✅✅');
            console.log('CampusHomeComponent: Response:', response);
            console.log('CampusHomeComponent: Response success:', response?.success);
            console.log('CampusHomeComponent: Response message:', response?.message);
            
            // Defer state changes to next tick to avoid ExpressionChangedAfterItHasBeenCheckedError
            setTimeout(() => {
              this.submittingPlacedStudents = false;
              if (response?.success) {
                console.log('CampusHomeComponent: ✅ Placed student added successfully');
                console.log('CampusHomeComponent: Response data:', response?.data);
                this.notify.success(response?.message || 'Placed student added successfully');
                this.closeModal();
              // Reload placed students after adding a new one
              this.loadPlacedStudents();
                // Reset to page 1 to see the newest students first
                console.log('CampusHomeComponent: Resetting to page 1 and reloading placed students...');
                this.placedStudentsPage = 1;
                // Reload placed students after adding a new one
                this.loadPlacedStudents();
              } else {
                console.warn('CampusHomeComponent: ⚠️ Response success is false');
                this.notify.warn(response?.message || 'Placed student might not have been added');
              }
              // Safe change detection - won't crash if component is destroyed
              try {
                this.cdr.detectChanges();
              } catch (e) {
                // Component might be destroyed, ignore
                console.warn('Change detection skipped:', e);
              }
            }, 0);
          },
          error: (err) => {
            console.error('CampusHomeComponent: ❌❌❌ ADD PLACED STUDENT API ERROR ❌❌❌');
            console.error('CampusHomeComponent: Error status:', err?.status);
            console.error('CampusHomeComponent: Error URL:', err?.url);
            console.error('CampusHomeComponent: Error response:', err?.error);
            
            // HTTP interceptor will show error notification to user
            // Defer state change to next tick to avoid ExpressionChangedAfterItHasBeenCheckedError
            setTimeout(() => {
              this.submittingPlacedStudents = false;
              // Safe change detection - won't crash if component is destroyed
              try {
                this.cdr.detectChanges();
              } catch (e) {
                // Component might be destroyed, ignore
                console.warn('Change detection skipped:', e);
              }
            }, 0);
          },
        });
      })
      .catch((err) => {
        console.error('CampusHomeComponent: ❌ Error converting file to base64:', err);
        // Defer state change to next tick to avoid ExpressionChangedAfterItHasBeenCheckedError
        setTimeout(() => {
          this.submittingPlacedStudents = false;
          this.cdr.detectChanges();
        }, 0);
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

  handleFacultySubmit(value: FacultyFormValue): void {
    console.log('HomeComponent: ========== FORM SUBMIT TRIGGERED ==========');
    console.log('HomeComponent: Form value received:', value);
    console.log('HomeComponent: Current URL:', window.location.href);
    console.log('HomeComponent: Current path:', window.location.pathname);
    
    // Validate required fields
    if (
      !value.fullName.trim() ||
      !value.email.trim() ||
      !value.dateOfBirth.trim() ||
      !value.phoneNumber.trim()
    ) {
      console.warn('HomeComponent: ⚠️ Validation failed - missing required fields');
      console.warn('HomeComponent: fullName:', value.fullName.trim());
      console.warn('HomeComponent: email:', value.email.trim());
      console.warn('HomeComponent: dateOfBirth:', value.dateOfBirth.trim());
      console.warn('HomeComponent: phoneNumber:', value.phoneNumber.trim());
      this.submittingFaculty = false;
      this.notify.error('Please fill all required fields');
      return;
    }
    
    console.log('HomeComponent: ✅ Basic validation passed');

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value.email.trim())) {
      this.submittingFaculty = false;
      this.notify.error('Please enter a valid email address');
      return;
    }

    // Validate professional info
    if (!value.professionalInfo || value.professionalInfo.length === 0) {
      this.submittingFaculty = false;
      this.notify.error('Please add at least one professional information entry');
      return;
    }

    // Validate each professional info entry
    for (const info of value.professionalInfo) {
      if (
        !info.designation.trim() ||
        !info.department.trim() ||
        !info.specialization.trim() ||
        !info.yearsOfExperience.trim()
      ) {
        this.submittingFaculty = false;
        this.notify.error('Please fill all required fields in professional information');
        return;
      }
    }

    console.log('HomeComponent: ✅ All validations passed');
    console.log('HomeComponent: Setting submittingFaculty = true');
    this.submittingFaculty = true;
    console.log('HomeComponent: Proceeding to prepare request data...');

    // Prepare basic information JSON
    // Convert date format from input (YYYY-MM-DD) to API format (YYYY-MM-DD)
    // The date input already provides YYYY-MM-DD format, but let's ensure it's correct
    let dateOfBirth = value.dateOfBirth.trim();
    
        // If date is in MM/DD/YYYY format, convert to YYYY-MM-DD
        if (dateOfBirth.includes('/')) {
          const parts = dateOfBirth.split('/');
          if (parts.length === 3) {
            dateOfBirth = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
          }
        }
    
    const basicInformation: {
      fullName: string;
      email: string;
      dateOfBirth: string;
      phoneNumber: string;
      photo?: File | null;
    } = {
      fullName: value.fullName.trim(),
      email: value.email.trim(),
      dateOfBirth: dateOfBirth,
      phoneNumber: value.phoneNumber.trim(),
    };
    
    // Note: Photo is not included in JSON request body
    // If photo is required, backend should handle it separately or we need to use FormData
    console.log('HomeComponent: Photo file present?', !!value.photo);
    console.log('HomeComponent: Photo file name:', value.photo?.name || 'No photo');

    // Prepare professional information JSON (without file references)
    // API expects arrays for designation, department, specialization, yearsOfExperience, and qualifications
    const professionalInformation = value.professionalInfo.map((info) => {
      // Parse yearsOfExperience - handle ranges like "1-5", "6-10", "11-15", "16+"
      const yearsExp = info.yearsOfExperience.trim();
      let yearsExpNum = 0;
      
      if (yearsExp) {
        // Handle range values like "1-5", "6-10", etc.
        if (yearsExp.includes('-')) {
          const parts = yearsExp.split('-');
          if (parts.length === 2) {
            // Take the maximum value from the range
            const max = parseInt(parts[1].trim(), 10);
            yearsExpNum = isNaN(max) ? 0 : max;
          }
        } else if (yearsExp.endsWith('+')) {
          // Handle "16+" - take the minimum value
          const min = parseInt(yearsExp.replace('+', '').trim(), 10);
          yearsExpNum = isNaN(min) ? 0 : min;
        } else {
          // Direct number
          const num = parseInt(yearsExp, 10);
          yearsExpNum = isNaN(num) ? 0 : num;
        }
      }
      
      // Parse yearsOfExperience - ensure it's a valid number
      const yearsExpArray = yearsExpNum > 0 ? [yearsExpNum] : [];
      
      // Parse qualifications - split by comma or newline if multiple, otherwise single item array
      const qualificationsStr = info.qualifications.trim();
      const qualificationsArray = qualificationsStr
        ? qualificationsStr.split(/[,\n]/).map(q => q.trim()).filter(q => q.length > 0)
        : [];
      
      // Ensure all arrays have at least one value (backend might require non-empty arrays)
      const designationArray = info.designation.trim() ? [info.designation.trim()] : [];
      const departmentArray = info.department.trim() ? [info.department.trim()] : [];
      const specializationArray = info.specialization.trim()
        ? info.specialization.split(/[,\n]/).map(s => s.trim()).filter(s => s.length > 0)
        : [];
      
      console.log('HomeComponent: Professional Info Entry:', {
        designation: designationArray,
        department: departmentArray,
        specialization: specializationArray,
        yearsOfExperience: yearsExpArray,
        qualifications: qualificationsArray
      });
      
      return {
        designation: designationArray,
        department: departmentArray,
        specialization: specializationArray,
        yearsOfExperience: yearsExpArray,
        qualifications: qualificationsArray,
        // Note: certificates will be added as files separately in FormData
        certificates: [], // Empty array - files will be added separately
      };
    });

    // According to Swagger and Thunder: professionalInformation should be a SINGLE OBJECT
    // Backend expects only ONE professionalInformation entry (not merged/multiple)
    // If user has multiple entries, we'll use only the FIRST one (as per backend limitation)
    let professionalInformationObj: {
      designation: string[];
      department: string[];
      specialization: string[];
      yearsOfExperience: number[];
      qualifications: string[];
      certificates?: string[]; // For file URLs if needed
    };

    if (professionalInformation.length === 0) {
      // Empty object if no professional info
      professionalInformationObj = {
        designation: [],
        department: [],
        specialization: [],
        yearsOfExperience: [],
        qualifications: [],
        certificates: [],
      };
    } else {
      if (professionalInformation.length > 1) {
        this.notify.warn('Only the first professional information entry will be saved.');
      }
      professionalInformationObj = professionalInformation[0];
    }

    // Prepare request data (JSON format - like Thunder/Postman)
    const requestData = {
      basicInformation,
      professionalInformation: professionalInformationObj
    };
    
    console.log('HomeComponent: ========== FINAL REQUEST DATA ==========');
    console.log('HomeComponent: Complete request payload:', JSON.stringify(requestData, null, 2));
    console.log('HomeComponent: Basic Info keys:', Object.keys(basicInformation));
    console.log('HomeComponent: Professional Info keys:', Object.keys(professionalInformationObj));
    console.log('HomeComponent: Professional Info values:', {
      designation: professionalInformationObj.designation,
      department: professionalInformationObj.department,
      specialization: professionalInformationObj.specialization,
      yearsOfExperience: professionalInformationObj.yearsOfExperience,
      qualifications: professionalInformationObj.qualifications,
      certificates: professionalInformationObj.certificates
    });

    // Check authentication
    const token = this.authState.token();
    
    if (!token) {
      this.submittingFaculty = false;
      this.notify.error('Authentication required. Please login again.');
      return;
    }
    
    console.log('HomeComponent: ========== STARTING FACULTY POST API ==========');
    console.log('HomeComponent: Request data:', JSON.stringify(requestData, null, 2));
    console.log('HomeComponent: Basic Information:', JSON.stringify(basicInformation, null, 2));
    console.log('HomeComponent: Professional Information:', JSON.stringify(professionalInformationObj, null, 2));
    console.log('HomeComponent: Photo file:', value.photo ? `File: ${value.photo.name}, Size: ${value.photo.size} bytes, Type: ${value.photo.type}` : 'No photo');
    console.log('HomeComponent: Token exists:', !!token);
    console.log('HomeComponent: Token length:', token.length);
    console.log('HomeComponent: Current URL before API call:', window.location.href);
    console.log('HomeComponent: Endpoint:', API_ENDPOINTS.CAMPUS.ADD_FACULTY);
    
    // Prevent any navigation during API call
    const currentPath = window.location.pathname;
    console.log('HomeComponent: Current path:', currentPath);
    
    this.campusApi.addFaculty(requestData).subscribe({
      next: (response) => {
        console.log('HomeComponent: ========== FACULTY POST API SUCCESS ==========');
        console.log('HomeComponent: Response received:', response);
        console.log('HomeComponent: Response type:', typeof response);
        console.log('HomeComponent: Response is null?', response === null);
        console.log('HomeComponent: Current URL after success:', window.location.href);
        
        // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
        setTimeout(() => {
          // Check if response is null (API service returned null)
          if (response === null) {
            console.error('HomeComponent: ⚠️ Response is NULL - API might have returned unexpected format');
            console.error('HomeComponent: But API call was successful (200 status)');
            console.error('HomeComponent: This might mean backend returned different structure');
            this.submittingFaculty = false;
            this.notify.warn('Faculty might have been added, but response format was unexpected. Please refresh the page.');
            this.closeModal();
            // Still trigger refresh in case it was added
            window.dispatchEvent(new Event('facultyAdded'));
            
            try {
              this.cdr.detectChanges();
            } catch {
              // Component might be destroyed, ignore
            }
            return;
          }
          
          this.submittingFaculty = false;
          const successMessage = response?.message || 'Faculty added successfully!';
          console.log('HomeComponent: Success message:', successMessage);
          console.log('HomeComponent: Response success:', response?.success);
          console.log('HomeComponent: Response data:', response?.data);
          
          this.notify.success(successMessage);
          
          // Close modal after short delay to show success message
          setTimeout(() => {
            console.log('HomeComponent: Closing modal after success');
            this.closeModal();
          }, 500);

          // Trigger refresh event for sidebar
          console.log('HomeComponent: Dispatching facultyAdded event to refresh sidebar...');
          window.dispatchEvent(new Event('facultyAdded'));
          console.log('HomeComponent: Event dispatched - sidebar should refresh now');

          try {
            this.cdr.detectChanges();
          } catch {
            // Component might be destroyed, ignore
          }
        }, 0);
      },
      error: (err) => {
        console.error('HomeComponent: ========== FACULTY POST API ERROR ==========');
        console.error('HomeComponent: Error status:', err?.status);
        console.error('HomeComponent: Error URL:', err?.url);
        console.error('HomeComponent: Error response:', err?.error);
        console.error('HomeComponent: Current URL after error:', window.location.href);
        
        // Check token status after error
        const tokenAfterError = this.authState.token();
        console.error('HomeComponent: Token after error:', !!tokenAfterError);
        console.error('HomeComponent: Token length:', tokenAfterError?.length || 0);
        
        // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
        setTimeout(() => {
          this.submittingFaculty = false;
          
          let errorMessage = 'Failed to add faculty';
          if (err?.status === 401) {
            errorMessage = 'Unauthorized: Your session has expired. Please login again.';
            console.error('HomeComponent: ⚠️ 401 Error - BUT NOT REDIRECTING');
            console.error('HomeComponent: ⚠️ Token still exists:', !!tokenAfterError);
          } else if (err?.status === 403) {
            errorMessage = 'Forbidden: You do not have permission to add faculty.';
          } else if (err?.status === 500) {
            // Handle 500 Internal Server Error
            if (err?.error?.error) {
              errorMessage = err.error.error;
            } else if (err?.error?.message) {
              errorMessage = err.error.message;
            } else {
              errorMessage = 'Server error: An internal error occurred. Please check the request data and try again.';
            }
            console.error('HomeComponent: ⚠️ 500 Server Error - Check backend logs');
            console.error('HomeComponent: Error details:', JSON.stringify(err?.error, null, 2));
          } else if (err?.status === 502) {
            errorMessage = 'Service temporarily unavailable. Please check your connection and try again.';
          } else if (err?.status === 0) {
            errorMessage = 'Network error: Unable to connect to server.';
          } else if (err?.error?.message) {
            errorMessage = err.error.message;
          } else if (err?.error?.error) {
            errorMessage = err.error.error;
          } else if (err?.message) {
            errorMessage = err.message;
          }

          if (err?.error?.errors && typeof err.error.errors === 'object') {
            const validationErrors = Object.entries(err.error.errors)
              .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
              .join('; ');
            errorMessage = validationErrors || errorMessage;
          }
          
          console.error('HomeComponent: Showing error notification - NO REDIRECT');
          console.error('HomeComponent: Modal will stay open');
          console.error('HomeComponent: Current path after error:', window.location.pathname);
          console.error('HomeComponent: Path changed?', window.location.pathname !== currentPath);
          
          // CRITICAL: Don't close modal, don't redirect, don't clear token
          // Just show error and let user try again
          
          // Double-check: If path changed, log it (shouldn't happen)
          if (window.location.pathname !== currentPath) {
            console.error('HomeComponent: ⚠️⚠️⚠️ PATH CHANGED - REDIRECT DETECTED!');
            console.error('HomeComponent: Old path:', currentPath);
            console.error('HomeComponent: New path:', window.location.pathname);
          }
          
          this.notify.error(errorMessage);
          
          // Trigger change detection after state update
          try {
            this.cdr.detectChanges();
          } catch {
            // Ignore if component is destroyed
          }
        }, 0);
      },
    });
  }

  handleFacultyCancel(): void {
    this.closeModal();
  }

  handleCourseFormSubmit(value: CourseFormValue): void {
    if (!value.courseName.trim() || !value.courseDuration.trim() || !value.seatsAvailable.trim() || !value.description.trim()) {
      this.submittingCourseForm = false;
      return;
    }

    this.submittingCourseForm = true;

    const request = {
      courseName: value.courseName.trim(),
      courseDuration: value.courseDuration.trim(),
      seatsAvailable: value.seatsAvailable.trim(),
      description: value.description.trim(),
    };

    this.campusApi.addCourse(request).subscribe({
      next: () => {
        console.log('API Integration Working - Course Added Successfully');
        this.submittingCourseForm = false;
        this.notify.success('Course added successfully');
        this.closeModal();
        try {
          this.cdr.detectChanges();
        } catch {
          // Component might be destroyed, ignore
        }
      },
      error: (err) => {
        const errorMessage = err?.error?.message || err?.message || 'Failed to add course';
        console.error('API Integration Failed -', errorMessage);
        this.submittingCourseForm = false;
        this.notify.error(errorMessage);
        try {
          this.cdr.detectChanges();
        } catch {
          // Ignore
        }
      },
    });
  }
}

interface PersonCard {
  name: string;
  subtitle: string;
  imageUrl: string;
}

interface FeedPost {
  author: string;
  authorId: string;
  imageUrl: string;
  text: string;
}

function totalPages(totalItems: number, pageSize: number): number {
  const safeSize = Math.max(1, pageSize);
  return Math.max(1, Math.ceil(Math.max(0, totalItems) / safeSize));
}

function slicePage<T>(items: readonly T[], page: number, pageSize: number): readonly T[] {
  const safeSize = Math.max(1, pageSize);
  const total = totalPages(items.length, safeSize);
  const safePage = Math.max(1, Math.min(total, page));
  const start = (safePage - 1) * safeSize;
  return items.slice(start, start + safeSize);
}


