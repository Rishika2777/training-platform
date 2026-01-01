import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CarouselComponent } from '../../../../shared/components/carousel/carousel.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ModalService } from '../../../../core/modal/modal.service';
import { StudentResumeUploadComponent } from '../resume-upload/student-resume-upload.component';
import { StudentCareerCheckinComponent } from '../career-checkin/student-career-checkin.component';
import { StudentLearningPathwayComponent } from '../learning-pathway/student-learning-pathway.component';
import { StudentIdeasSubmissionComponent } from '../ideas-submission/student-ideas-submission.component';
import { StudentAiToolkitComponent } from '../ai-toolkit/ai-toolkit.component';
import { StudentApiService } from '../../services/student-api.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-student-home',
  standalone: true,
  imports: [
    CommonModule,
    CarouselComponent,
    ModalComponent,
    StudentResumeUploadComponent,
    StudentCareerCheckinComponent,
    StudentLearningPathwayComponent,
    StudentIdeasSubmissionComponent,
    StudentAiToolkitComponent,
  ],
  templateUrl: './student-home.component.html',
  styleUrl: './student-home.component.css',
})
export class StudentHomeComponent implements OnInit {
  readonly modalService = inject(ModalService);
  readonly studentApiService = inject(StudentApiService);
  readonly authService = inject(AuthService);

  readonly activeModal = computed(() => this.modalService.activeModal());
  readonly isResumeModalOpen = computed(() => this.activeModal() === 'resume-upload');
  readonly isCareerCheckinModalOpen = computed(() => this.activeModal() === 'career-checkin');
  readonly isLearningPathwayModalOpen = computed(() => this.activeModal() === 'learning-pathway');
  readonly isIdeasSubmissionModalOpen = computed(() => this.activeModal() === 'ideas-submission');
  readonly isDreamJobToolkitModalOpen = computed(() => this.activeModal() === 'dream-job-toolkit');

  submittingResume = false;
  submittingCareerCheckin = false;
  submittingIdeas = false;
  readonly announcementDate = 'January 7th, 2025';

  readonly batchmates = signal<readonly PersonCard[]>([]);
  readonly placedStudents = signal<readonly PersonCard[]>([]);
  readonly alumni = signal<readonly PersonCard[]>([]);

  loadingBatchmates = signal(false);
  loadingPlacedStudents = signal(false);
  loadingAlumni = signal(false);

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

  readonly registeredCompaniesSlots = 3;

  // Carousel / pagination state (shared component usage)
  readonly peoplePageSize = 6;
  batchmatesPage = 1;
  placedStudentsPage = 1;
  alumniPage = 1;

  batchmatesTotalPages = signal(1);
  placedStudentsTotalPages = signal(1);
  alumniTotalPages = signal(1);

  batchmatesPageItems(): readonly PersonCard[] {
    return slicePage(this.batchmates(), this.batchmatesPage, this.peoplePageSize);
  }

  placedStudentsPageItems(): readonly PersonCard[] {
    return slicePage(this.placedStudents(), this.placedStudentsPage, this.peoplePageSize);
  }

  alumniPageItems(): readonly PersonCard[] {
    return slicePage(this.alumni(), this.alumniPage, this.peoplePageSize);
  }

  ngOnInit(): void {
    console.log('StudentHomeComponent: ngOnInit called');
    this.loadData();
  }

  loadData(): void {
    console.log('StudentHomeComponent: loadData called');
    const currentUser = this.authService.getCurrentUser();
    const studentId = 'e09112c7-89f7-4e78-a147-a3fedd9526b2';

    console.log('StudentHomeComponent: studentId =', studentId);
    console.log('StudentHomeComponent: currentUser =', currentUser);

    if (!studentId) {
      console.warn('Student ID not found. Cannot load batchmates, alumni, or placed students.');
      return;
    }

    console.log('StudentHomeComponent: Calling loadBatchmates, loadPlacedStudents, loadAlumni');
    this.loadBatchmates(studentId);
    this.loadPlacedStudents();
    this.loadAlumni(studentId);
  }

  loadBatchmates(studentId: string): void {
    console.log('StudentHomeComponent: loadBatchmates called with studentId =', studentId);
    this.loadingBatchmates.set(true);
    this.studentApiService
      .getBatchmates(studentId, this.batchmatesPage, this.peoplePageSize)
      .pipe(
        catchError((error) => {
          console.error('Error loading batchmates:', error);
          this.loadingBatchmates.set(false);
          return of(null);
        }),
      )
      .subscribe({
        next: (response) => {
          console.log('StudentHomeComponent: Batchmates response received:', response);
          this.loadingBatchmates.set(false);
          if (response?.success && response.data) {
            const items = response.data.map((item) => this.mapBatchmateToPersonCard(item));
            console.log('StudentHomeComponent: Mapped batchmates items:', items);
            this.batchmates.set(items);
            // For batchmates, API returns array, calculate pages from length
            // Note: If API returns pagination metadata, use that instead
            this.batchmatesTotalPages.set(Math.max(1, Math.ceil(items.length / this.peoplePageSize)));
          } else {
            console.warn('StudentHomeComponent: Batchmates response not successful or no data:', response);
          }
        },
        error: (error) => {
          console.error('StudentHomeComponent: Batchmates subscription error:', error);
          this.loadingBatchmates.set(false);
        },
      });
  }

  loadPlacedStudents(): void {
    console.log('StudentHomeComponent: loadPlacedStudents called');
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
          console.log('StudentHomeComponent: Placed students response received:', response);
          this.loadingPlacedStudents.set(false);
          if (response?.success && response.data) {
            const items = (response.data.content || []).map((item) => this.mapPlacedStudentToPersonCard(item));
            console.log('StudentHomeComponent: Mapped placed students items:', items);
            this.placedStudents.set(items);
            this.placedStudentsTotalPages.set(response.data.totalPages || 1);
          } else {
            console.warn('StudentHomeComponent: Placed students response not successful or no data:', response);
          }
        },
        error: (error) => {
          console.error('StudentHomeComponent: Placed students subscription error:', error);
          this.loadingPlacedStudents.set(false);
        },
      });
  }

  loadAlumni(studentId: string): void {
    console.log('StudentHomeComponent: loadAlumni called with studentId =', studentId);
    this.loadingAlumni.set(true);
    // Use current year as default yearOfPassing for alumni
    const currentYear = new Date().getFullYear().toString();
    console.log('StudentHomeComponent: Loading alumni for year =', currentYear);
    this.studentApiService
      .getAlumniForStudent(studentId, currentYear, this.alumniPage, this.peoplePageSize)
      .pipe(
        catchError((error) => {
          console.error('Error loading alumni:', error);
          this.loadingAlumni.set(false);
          return of(null);
        }),
      )
      .subscribe({
        next: (response) => {
          console.log('StudentHomeComponent: Alumni response received:', response);
          this.loadingAlumni.set(false);
          if (response?.success && response.data) {
            const items = (response.data.content || []).map((item) => this.mapAlumniToPersonCard(item));
            console.log('StudentHomeComponent: Mapped alumni items:', items);
            this.alumni.set(items);
            this.alumniTotalPages.set(response.data.totalPages || 1);
          } else {
            console.warn('StudentHomeComponent: Alumni response not successful or no data:', response);
          }
        },
        error: (error) => {
          console.error('StudentHomeComponent: Alumni subscription error:', error);
          this.loadingAlumni.set(false);
        },
      });
  }

  onBatchmatesPageChange(page: number): void {
    this.batchmatesPage = page;
    const currentUser = this.authService.getCurrentUser();
    const studentId = currentUser?.profileServiceId;
    if (studentId) {
      this.loadBatchmates(studentId);
    }
  }

  onPlacedStudentsPageChange(page: number): void {
    this.placedStudentsPage = page;
    this.loadPlacedStudents();
  }

  onAlumniPageChange(page: number): void {
    this.alumniPage = page;
    const currentUser = this.authService.getCurrentUser();
    const studentId = currentUser?.profileServiceId;
    if (studentId) {
      this.loadAlumni(studentId);
    }
  }

  private mapBatchmateToPersonCard(item: {
    firstName?: string;
    lastName?: string;
    profilePhotoUrl?: string;
    batch?: string;
  }): PersonCard {
    const name = [item.firstName, item.lastName].filter(Boolean).join(' ') || 'Unknown';
    const subtitle = item.batch || '';
    return {
      name,
      subtitle,
      imageUrl: item.profilePhotoUrl || 'assets/images/login-news-image.png',
    };
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

  private mapAlumniToPersonCard(item: {
    firstName?: string;
    lastName?: string;
    profilePhotoUrl?: string;
    designation?: string;
    companyName?: string;
  }): PersonCard {
    const name = [item.firstName, item.lastName].filter(Boolean).join(' ') || 'Unknown';
    const subtitle = [item.designation, item.companyName].filter(Boolean).join(' ') || '';
    return {
      name,
      subtitle,
      imageUrl: item.profilePhotoUrl || 'assets/images/login-news-image.png',
    };
  }

  closeModal(): void {
    this.modalService.closeModal();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleResumeSubmit(_value: unknown): void {
    // API call will be implemented here
    this.submittingResume = true;
    // TODO: Call API service
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleCareerCheckinSubmit(_value: unknown): void {
    // API call will be implemented here
    this.submittingCareerCheckin = true;
    // TODO: Call API service
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleIdeasSubmit(_value: unknown): void {
    // API call will be implemented here
    this.submittingIdeas = true;
    // TODO: Call API service
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

