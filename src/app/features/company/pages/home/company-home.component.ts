import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { CarouselComponent } from '../../../../shared/components/carousel/carousel.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ModalService } from '../../../../core/modal/modal.service';
import { CompanySpecializationComponent } from '../specialization/company-specialization.component';
import { CompanyVisionPerformanceComponent } from '../vision-performance/company-vision-performance.component';
import { CompanyBenefitsComponent } from '../benefits/company-benefits.component';
import { CompanyCurrentVacancyComponent } from '../current-vacancy/company-current-vacancy.component';

@Component({
  selector: 'app-company-home',
  standalone: true,
  imports: [
    CommonModule,
    CarouselComponent,
    ModalComponent,
    CompanySpecializationComponent,
    CompanyVisionPerformanceComponent,
    CompanyBenefitsComponent,
    CompanyCurrentVacancyComponent,
  ],
  templateUrl: './company-home.component.html',
  styleUrl: './company-home.component.css',
})
export class CompanyHomeComponent {
  readonly modalService = inject(ModalService);

  readonly activeModal = computed(() => this.modalService.activeModal());
  readonly isSpecializationModalOpen = computed(() => this.activeModal() === 'company-specialization');
  readonly isVisionPerformanceModalOpen = computed(() => this.activeModal() === 'company-vision-performance');
  readonly isBenefitsModalOpen = computed(() => this.activeModal() === 'company-benefits');
  readonly isCurrentVacancyModalOpen = computed(() => this.activeModal() === 'company-current-vacancy');

  submittingSpecialization = false;
  submittingVisionPerformance = false;
  submittingBenefits = false;
  submittingCurrentVacancy = false;
  readonly announcementDate = 'January 7th, 2025';

  readonly keyPeople: readonly PersonCard[] = [
    { name: 'Name', subtitle: 'Designation', imageUrl: 'assets/images/login-news-image.png' },
    { name: 'Name', subtitle: 'Designation', imageUrl: 'assets/images/landing-card-campus.png' },
    { name: 'Name', subtitle: 'Designation', imageUrl: 'assets/images/landing-card-company.png' },
    { name: 'Name', subtitle: 'Designation', imageUrl: 'assets/images/landing-card-institution.png' },
    { name: 'Name', subtitle: 'Designation', imageUrl: 'assets/images/login-hero-image.png' },
  ];

  readonly clients: readonly ImageTile[] = [
    { imageUrl: null, alt: 'Client' },
    { imageUrl: null, alt: 'Client' },
  ];

  readonly preferredCampuses: readonly ImageTile[] = [
    { imageUrl: 'assets/images/landing-card-campus.png', alt: 'Preferred campus' },
    { imageUrl: 'assets/images/landing-card-campus.png', alt: 'Preferred campus' },
  ];

  readonly posts: readonly FeedPost[] = [
    {
      author: 'Ankitha Wilson',
      authorId: '1d',
      imageUrl: 'assets/images/landing-card-institution.png',
      text:
        '🚀 Innovate. Grow. Succeed.\nCommitted to excellence, driven by innovation, and focused on making an impact. The journey to a better future starts here!\n#Innovation #Success #Growth',
    },
    {
      author: 'Ankitha Wilson',
      authorId: '1d',
      imageUrl: 'assets/images/landing-card-institution.png',
      text:
        '🚀 Innovate. Grow. Succeed.\nCommitted to excellence, driven by innovation, and focused on making an impact. The journey to a better future starts here!\n#Innovation #Success #Growth',
    },
  ];

  // Carousel / pagination state (shared component usage)
  readonly peoplePageSize = 7;
  keyPeoplePage = 1;

  get keyPeopleTotalPages(): number {
    return totalPages(this.keyPeople.length, this.peoplePageSize);
  }

  keyPeoplePageItems(): readonly PersonCard[] {
    return slicePage(this.keyPeople, this.keyPeoplePage, this.peoplePageSize);
  }

  closeModal(): void {
    this.modalService.closeModal();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleSpecializationSubmit(_value: unknown): void {
    this.submittingSpecialization = true;
    // TODO: Call API service
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleVisionPerformanceSubmit(_value: unknown): void {
    this.submittingVisionPerformance = true;
    // TODO: Call API service
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleBenefitsSubmit(_value: unknown): void {
    this.submittingBenefits = true;
    // TODO: Call API service
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleCurrentVacancySubmit(_value: unknown): void {
    this.submittingCurrentVacancy = true;
    // TODO: Call API service
  }
}

interface PersonCard {
  name: string;
  subtitle: string;
  imageUrl: string;
}

interface ImageTile {
  imageUrl: string | null;
  alt: string;
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


