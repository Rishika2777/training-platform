import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CarouselComponent } from '../../../../shared/components/carousel/carousel.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { CampusProspectusComponent } from '../upload-prospectus/campus-prospectus.component';
import {
  CampusCompaniesVisitedComponent,
  CompaniesVisitedFormValue,
} from '../companies-visited/campus-companies-visited.component';
import { CampusPlacedStudentsComponent, PlacedStudentsFormValue } from '../placed-students/campus-placed-students.component';
import { CampusCoursesComponent } from '../courses/campus-courses.component';
import { CampusFacultyComponent } from '../faculty/campus-faculty.component';
import { CampusCourseFormComponent } from '../course-form/course-form.component';
import { ModalService } from '../../../../core/modal/modal.service';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { CampusApiService } from '../../services/campus-api.service';
import { StudentApiService } from '../../../student/services/student-api.service';
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

  readonly activeModal = computed(() => this.modalService.activeModal());
  readonly isProspectusModalOpen = computed(() => this.activeModal() === 'prospectus-upload');
  readonly isCompaniesModalOpen = computed(() => this.activeModal() === 'companies-visited');
  readonly isPlacedStudentsModalOpen = computed(() => this.activeModal() === 'placed-students');
  readonly isCoursesModalOpen = computed(() => this.activeModal() === 'courses');
  readonly isFacultyModalOpen = computed(() => this.activeModal() === 'faculty');
  readonly isCourseFormModalOpen = computed(() => this.activeModal() === 'course-form');

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
    this.loadingPlacedStudents.set(true);
    this.studentApiService
      .getPlacedStudents(this.placedStudentsPage, this.peoplePageSize)
      .pipe(
        catchError((error) => {
          console.error('Error loading placed students:', error);
          this.loadingPlacedStudents.set(false);
          return of(null);
        }),
      )
      .subscribe({
        next: (response) => {
          this.loadingPlacedStudents.set(false);
          if (response?.success && response.data) {
            const items = (response.data.content || []).map((item) => this.mapPlacedStudentToPersonCard(item));
            this.placedStudents.set(items);
            this.placedStudentsTotalPages.set(response.data.totalPages || 1);
          }
        },
        error: (error) => {
          console.error('Placed students subscription error:', error);
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
    designation?: string;
  }): PersonCard {
    // Use studentName if available, otherwise fall back to firstName + lastName
    const name = item.studentName || [item.firstName, item.lastName].filter(Boolean).join(' ') || 'Unknown';
    const subtitle = [item.batch, item.companyName].filter(Boolean).join(' ') || '';
    return {
      name,
      subtitle,
      imageUrl: item.profilePhotoUrl || 'assets/images/login-news-image.png',
    };
  }

  alumniPageItems(): readonly PersonCard[] {
    return slicePage(this.alumni, this.alumniPage, this.peoplePageSize);
  }

  closeModal(): void {
    this.modalService.closeModal();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleProspectusSubmit(_value: unknown): void {
    // API call will be implemented here
    this.submittingProspectus = true;
    // TODO: Call API service
    // this.campusApi.uploadProspectus(value).subscribe({
    //   next: () => {
    //     this.submittingProspectus = false;
    //     this.closeModal();
    //   },
    //   error: () => {
    //     this.submittingProspectus = false;
    //   }
    // });
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
    this.submittingPlacedStudents = true;

    // Convert File to base64 string
    this.convertFileToBase64(value.studentPhoto)
      .then((photoBase64) => {
        const request = {
          studentName: value.studentName,
          photo: photoBase64 || '',
          courseId: value.course, // Assuming course dropdown value is the courseId
          batch: value.batch,
          placementCompanyId: value.placementCompany, // Assuming placementCompany value is the placementCompanyId
          designation: value.designation,
          sector: value.sector,
        };

        this.campusApi.addPlacedStudent(request).subscribe({
          next: (response) => {
            // Defer state changes to next tick to avoid ExpressionChangedAfterItHasBeenCheckedError
            setTimeout(() => {
            this.submittingPlacedStudents = false;
            if (response?.success) {
              this.closeModal();
              // Reload placed students after adding a new one
              this.loadPlacedStudents();
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
          error: () => {
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
        console.error('Error converting file to base64:', err);
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleFacultySubmit(_value: unknown): void {
    // API call will be implemented here
    this.submittingFaculty = true;
    // TODO: Call API service
    // this.campusApi.addFaculty(value).subscribe({
    //   next: () => {
    //     this.submittingFaculty = false;
    //     this.closeModal();
    //   },
    //   error: () => {
    //     this.submittingFaculty = false;
    //   }
    // });
  }

  handleFacultyCancel(): void {
    this.closeModal();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleCourseFormSubmit(_value: unknown): void {
    // API call will be implemented here
    this.submittingCourseForm = true;
    // TODO: Call API service
    // this.campusApi.addCourse(value).subscribe({
    //   next: () => {
    //     this.submittingCourseForm = false;
    //     this.closeModal();
    //   },
    //   error: () => {
    //     this.submittingCourseForm = false;
    //   }
    // });
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


