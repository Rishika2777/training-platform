import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { CarouselComponent } from '../../../../shared/components/carousel/carousel.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { CampusProspectusComponent } from '../upload-prospectus/campus-prospectus.component';
import { CampusCompaniesVisitedComponent } from '../companies-visited/campus-companies-visited.component';
import { CampusPlacedStudentsComponent } from '../placed-students/campus-placed-students.component';
import { CampusCoursesComponent } from '../courses/campus-courses.component';
import { CampusFacultyComponent } from '../faculty/campus-faculty.component';
import { ModalService } from '../../../../core/modal/modal.service';

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
  ],
  templateUrl: './campus-home.component.html',
  styleUrl: './campus-home.component.css',
})
export class CampusHomeComponent {
  readonly modalService = inject(ModalService);

  readonly activeModal = computed(() => this.modalService.activeModal());
  readonly isProspectusModalOpen = computed(() => this.activeModal() === 'prospectus-upload');
  readonly isCompaniesModalOpen = computed(() => this.activeModal() === 'companies-visited');
  readonly isPlacedStudentsModalOpen = computed(() => this.activeModal() === 'placed-students');
  readonly isCoursesModalOpen = computed(() => this.activeModal() === 'courses');
  readonly isFacultyModalOpen = computed(() => this.activeModal() === 'faculty');

  submittingProspectus = false;
  submittingCompanies = false;
  submittingPlacedStudents = false;
  submittingFaculty = false;
  readonly announcementDate = 'January 7th, 2025';

  readonly currentBatch: readonly PersonCard[] = [
    { name: 'Name(Cs)', subtitle: 'Name(Cs)', imageUrl: 'assets/images/login-news-image.png' },
    { name: 'Name(Cs)', subtitle: 'Name(Cs)', imageUrl: 'assets/images/landing-card-campus.png' },
    { name: 'Name(Cs)', subtitle: 'Name(Cs)', imageUrl: 'assets/images/landing-card-company.png' },
    { name: 'Name(Cs)', subtitle: 'Name(Cs)', imageUrl: 'assets/images/landing-card-institution.png' },
    { name: 'Name(Cs)', subtitle: 'Name(Cs)', imageUrl: 'assets/images/login-hero-image.png' },
  ];

  readonly placedStudents: readonly PersonCard[] = [
    { name: 'Name', subtitle: 'Batch Company', imageUrl: 'assets/images/login-news-image.png' },
    { name: 'Name', subtitle: 'Batch Company', imageUrl: 'assets/images/landing-card-campus.png' },
    { name: 'Name', subtitle: 'Batch Company', imageUrl: 'assets/images/landing-card-company.png' },
    { name: 'Name', subtitle: 'Batch Company', imageUrl: 'assets/images/landing-card-institution.png' },
  ];

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

  get placedStudentsTotalPages(): number {
    return totalPages(this.placedStudents.length, this.peoplePageSize);
  }

  get alumniTotalPages(): number {
    return totalPages(this.alumni.length, this.peoplePageSize);
  }

  currentBatchPageItems(): readonly PersonCard[] {
    return slicePage(this.currentBatch, this.currentBatchPage, this.peoplePageSize);
  }

  placedStudentsPageItems(): readonly PersonCard[] {
    return slicePage(this.placedStudents, this.placedStudentsPage, this.peoplePageSize);
  }

  alumniPageItems(): readonly PersonCard[] {
    return slicePage(this.alumni, this.alumniPage, this.peoplePageSize);
  }

  closeModal(): void {
    this.modalService.closeModal();
  }

  handleProspectusSubmit(value: unknown): void {
    // API call will be implemented here
    console.log('Prospectus form submitted:', value);
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

  handleCompaniesSubmit(value: unknown): void {
    // API call will be implemented here
    console.log('Companies visited form submitted:', value);
    this.submittingCompanies = true;
    // TODO: Call API service
    // this.campusApi.addCompanyVisited(value).subscribe({
    //   next: () => {
    //     this.submittingCompanies = false;
    //     this.closeModal();
    //   },
    //   error: () => {
    //     this.submittingCompanies = false;
    //   }
    // });
  }

  handlePlacedStudentsSubmit(value: unknown): void {
    // API call will be implemented here
    console.log('Placed students form submitted:', value);
    this.submittingPlacedStudents = true;
    // TODO: Call API service
    // this.campusApi.addPlacedStudent(value).subscribe({
    //   next: () => {
    //     this.submittingPlacedStudents = false;
    //     this.closeModal();
    //   },
    //   error: () => {
    //     this.submittingPlacedStudents = false;
    //   }
    // });
  }

  handleFacultySubmit(value: unknown): void {
    // API call will be implemented here
    console.log('Faculty form submitted:', value);
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


