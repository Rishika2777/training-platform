import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CarouselComponent } from '../../../../shared/components/carousel/carousel.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ModalService } from '../../../../core/modal/modal.service';
import { CompanySpecializationComponent } from '../specialization/company-specialization.component';
import { CompanyVisionPerformanceComponent } from '../vision-performance/company-vision-performance.component';
import { CompanyBenefitsComponent } from '../benefits/company-benefits.component';
import { CompanyCurrentVacancyComponent } from '../current-vacancy/company-current-vacancy.component';
import { CompanyClientFormComponent, ClientFormValue } from '../client-form/company-client-form.component';
import { CompanyPreferredCampusFormComponent, PreferredCampusFormValue } from '../preferred-campus-form/company-preferred-campus-form.component';
import { SpecializationFormValue } from '../specialization/company-specialization.component';
import { CompanyApiService, KeyPersonResponse, PreferredCampusResponse, ClientResponse, SpecializationResponse, ClientRequest } from '../../services/company-api.service';
import { AuthStateService } from '../../../../core/auth/auth-state.service';
import { StorageService } from '../../../../core/storage/storage.service';
import { STORAGE_KEYS } from '../../../../core/config/app.constants';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { catchError, of } from 'rxjs';

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
    CompanyClientFormComponent,
    CompanyPreferredCampusFormComponent,
  ],
  templateUrl: './company-home.component.html',
  styleUrl: './company-home.component.css',
})
export class CompanyHomeComponent implements OnInit {
  readonly modalService = inject(ModalService);
  private readonly companyApi = inject(CompanyApiService);
  private readonly authState = inject(AuthStateService);
  private readonly storage = inject(StorageService);
  private readonly notify = inject(NotificationService);

  readonly activeModal = computed(() => this.modalService.activeModal());
  readonly isSpecializationModalOpen = computed(() => this.activeModal() === 'company-specialization');
  readonly isVisionPerformanceModalOpen = computed(() => this.activeModal() === 'company-vision-performance');
  readonly isBenefitsModalOpen = computed(() => this.activeModal() === 'company-benefits');
  readonly isCurrentVacancyModalOpen = computed(() => this.activeModal() === 'company-current-vacancy');
  readonly isClientFormModalOpen = computed(() => this.activeModal() === 'company-client-form');
  readonly isPreferredCampusFormModalOpen = computed(() => this.activeModal() === 'company-preferred-campus-form');

  submittingSpecialization = false;
  submittingVisionPerformance = false;
  submittingBenefits = false;
  submittingCurrentVacancy = false;
  submittingClientForm = false;
  submittingPreferredCampusForm = false;
  readonly announcementDate = 'January 7th, 2025';

  // Key People - API Integration
  readonly keyPeople = signal<readonly PersonCard[]>([]);
  readonly loadingKeyPeople = signal(false);

  // Clients - API Integration
  readonly clients = signal<ImageTile[]>([]);
  readonly loadingClients = signal(false);
  clientsPage = 0;
  readonly clientsPageSize = 10; // Assuming 10 clients per page
  readonly clientsTotalPages = signal(1);

  // Preferred Campuses - API Integration
  readonly preferredCampuses = signal<ImageTile[]>([]);
  readonly loadingPreferredCampuses = signal(false);

  // Specializations - API Integration
  readonly specializations = signal<readonly SpecializationResponse[]>([]);
  readonly loadingSpecializations = signal(false);

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
    return totalPages(this.keyPeople().length, this.peoplePageSize);
  }

  keyPeoplePageItems(): readonly PersonCard[] {
    return slicePage(this.keyPeople(), this.keyPeoplePage, this.peoplePageSize);
  }

  ngOnInit(): void {
    this.loadKeyPeople();
    this.loadPreferredCampuses();
    this.loadClients();
    this.loadSpecializations();
  }

  private getCompanyId(): string | null {
    // Try from auth state (user profile) - companyId from login response
    const currentUser = this.authState.user();
    const companyIdFromUser = currentUser?.companyId;
    if (companyIdFromUser) {
      return companyIdFromUser;
    }
    
    // Try from storage
    const companyIdFromStorage = this.storage.get(STORAGE_KEYS.COMPANY_ID) as string | null;
    if (companyIdFromStorage) {
      return companyIdFromStorage;
    }
    
    return null;
  }

  loadKeyPeople(): void {
    const companyId = this.getCompanyId();
    if (!companyId) {
      console.warn('CompanyHomeComponent: No company ID available, cannot load key people');
      return;
    }

    this.loadingKeyPeople.set(true);
    this.companyApi.getKeyPeople(companyId).pipe(
      catchError((error) => {
        console.error('CompanyHomeComponent: Error loading key people:', error);
        this.loadingKeyPeople.set(false);
        return of([]);
      })
    ).subscribe({
      next: (response: readonly KeyPersonResponse[]) => {
        this.loadingKeyPeople.set(false);
        // Map API response to PersonCard interface
        const mappedKeyPeople: PersonCard[] = response.map((person) => ({
          name: person.name || 'Name',
          subtitle: person.designation || 'Designation',
          imageUrl: person.photoUrl || 'assets/images/login-news-image.png',
        }));
        this.keyPeople.set(mappedKeyPeople);
        // Reset to first page when data loads
        this.keyPeoplePage = 1;
      },
      error: (error: unknown) => {
        console.error('CompanyHomeComponent: Error in key people subscription:', error);
        this.loadingKeyPeople.set(false);
        this.keyPeople.set([]);
      }
    });
  }

  loadPreferredCampuses(): void {
    const companyId = this.getCompanyId();
    if (!companyId) {
      console.warn('CompanyHomeComponent: No company ID available, cannot load preferred campuses');
      return;
    }

    this.loadingPreferredCampuses.set(true);
    this.companyApi.getPreferredCampuses(companyId).pipe(
      catchError((error) => {
        console.error('CompanyHomeComponent: Error loading preferred campuses:', error);
        this.loadingPreferredCampuses.set(false);
        return of([]);
      })
    ).subscribe({
      next: (response: readonly PreferredCampusResponse[]) => {
        this.loadingPreferredCampuses.set(false);
        // Map API response to ImageTile interface
        const mappedCampuses: ImageTile[] = response.map((campus) => ({
          imageUrl: campus.campusLogoUrl || 'assets/images/landing-card-campus.png',
          alt: campus.campusName || 'Preferred campus',
        }));
        this.preferredCampuses.set(mappedCampuses);
      },
      error: (error: unknown) => {
        console.error('CompanyHomeComponent: Error in preferred campuses subscription:', error);
        this.loadingPreferredCampuses.set(false);
        this.preferredCampuses.set([]);
      }
    });
  }

  loadClients(): void {
    const companyId = this.getCompanyId();
    if (!companyId) {
      console.warn('CompanyHomeComponent: No company ID available, cannot load clients');
      return;
    }

    this.loadingClients.set(true);
    this.companyApi.getClients(companyId, this.clientsPage, this.clientsPageSize).pipe(
      catchError((error) => {
        console.error('CompanyHomeComponent: Error loading clients:', error);
        this.loadingClients.set(false);
        return of([]);
      })
    ).subscribe({
      next: (response: readonly ClientResponse[]) => {
        this.loadingClients.set(false);
        // Map API response to ImageTile interface
        const mappedClients: ImageTile[] = response.map((client) => ({
          imageUrl: client.clientLogoUrl || null,
          alt: client.clientName || 'Client',
        }));
        this.clients.set(mappedClients);
        // TODO: Update totalPages from API response if available
      },
      error: (error: unknown) => {
        console.error('CompanyHomeComponent: Error in clients subscription:', error);
        this.loadingClients.set(false);
        this.clients.set([]);
      }
    });
  }

  loadSpecializations(): void {
    const companyId = this.getCompanyId();
    if (!companyId) {
      console.warn('CompanyHomeComponent: No company ID available, cannot load specializations');
      return;
    }

    this.loadingSpecializations.set(true);
    this.companyApi.getSpecializations(companyId).pipe(
      catchError((error) => {
        console.error('CompanyHomeComponent: Error loading specializations:', error);
        this.loadingSpecializations.set(false);
        return of([]);
      })
    ).subscribe({
      next: (response: readonly SpecializationResponse[]) => {
        this.loadingSpecializations.set(false);
        this.specializations.set(response);
      },
      error: (error: unknown) => {
        console.error('CompanyHomeComponent: Error in specializations subscription:', error);
        this.loadingSpecializations.set(false);
        this.specializations.set([]);
      }
    });
  }

  closeModal(): void {
    this.modalService.closeModal();
  }
   
  handleSpecializationSubmit(value: SpecializationFormValue): void {
    const companyId = this.getCompanyId();
    if (!companyId) {
      console.warn('CompanyHomeComponent: No company ID available, cannot submit specialization');
      this.notify.error('Unable to submit. Company ID not found.');
      this.submittingSpecialization = false;
      return;
    }

    this.submittingSpecialization = true;
    const technologies = value.technologies.filter(tech => tech.trim().length > 0);
    
    if (technologies.length === 0) {
      this.notify.error('Please add at least one technology.');
      this.submittingSpecialization = false;
      return;
    }

    // Add each technology one by one
    let completed = 0;
    let hasError = false;

    technologies.forEach(technologyId => {
      this.companyApi.addSpecialization(companyId, technologyId).pipe(
        catchError((error) => {
          console.error('CompanyHomeComponent: Error adding specialization:', error);
          hasError = true;
          return of(null);
        })
      ).subscribe({
        next: () => {
          completed++;
          if (completed === technologies.length) {
            this.submittingSpecialization = false;
            if (!hasError) {
              this.notify.success('Specializations added successfully!');
              this.loadSpecializations(); // Reload the list
              this.modalService.closeModal();
            } else {
              this.notify.error('Some specializations failed to add.');
            }
          }
        },
        error: (error: unknown) => {
          console.error('CompanyHomeComponent: Error in add specialization subscription:', error);
          completed++;
          hasError = true;
          if (completed === technologies.length) {
            this.submittingSpecialization = false;
            this.notify.error('An error occurred while adding specializations.');
          }
        }
      });
    });
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

   handleClientFormSubmit(value: ClientFormValue): void {
    const companyId = this.getCompanyId();
    if (!companyId) {
      console.warn('CompanyHomeComponent: No company ID available, cannot submit client');
      this.notify.error('Unable to submit. Company ID not found.');
      this.submittingClientForm = false;
      return;
    }

    this.submittingClientForm = true;
    
    // Build request body with only defined fields
    const request: ClientRequest = {
      clientName: value.clientName,
    };
    
    // Only add clientLogoUrl if a logo was provided
    if (value.logo) {
      request.clientLogoUrl = 'uploaded-url-placeholder'; // TODO: Handle file upload
    }

    this.companyApi.addClient(companyId, request).pipe(
      catchError((error) => {
        console.error('CompanyHomeComponent: Error adding client:', error);
        this.notify.error('Failed to add client. Please try again.');
        this.submittingClientForm = false;
        return of(null);
      })
    ).subscribe({
      next: (response) => {
        this.submittingClientForm = false;
        if (response) {
          this.notify.success('Client added successfully!');
          this.loadClients(); // Reload the list
          this.modalService.closeModal();
        } else {
          this.notify.error('Failed to add client.');
        }
      },
      error: (error: unknown) => {
        console.error('CompanyHomeComponent: Error in add client subscription:', error);
        this.submittingClientForm = false;
        this.notify.error('An error occurred while adding the client.');
      }
    });
  }

  handlePreferredCampusFormSubmit(value: PreferredCampusFormValue): void {
    const companyId = this.getCompanyId();
    if (!companyId) {
      console.warn('CompanyHomeComponent: No company ID available, cannot submit preferred campus');
      this.notify.error('Unable to submit. Company ID not found.');
      this.submittingPreferredCampusForm = false;
      return;
    }

    this.submittingPreferredCampusForm = true;
    const request = {
      campusName: value.campusName,
      campusLogoUrl: value.photo ? 'uploaded-url-placeholder' : undefined, // TODO: Handle file upload
    };

    this.companyApi.addPreferredCampus(companyId, request).pipe(
      catchError((error) => {
        console.error('CompanyHomeComponent: Error adding preferred campus:', error);
        this.notify.error('Failed to add preferred campus. Please try again.');
        this.submittingPreferredCampusForm = false;
        return of(null);
      })
    ).subscribe({
      next: (response: PreferredCampusResponse | null) => {
        this.submittingPreferredCampusForm = false;
        if (response) {
          this.notify.success('Preferred campus added successfully!');
          this.loadPreferredCampuses(); // Reload the list
          this.modalService.closeModal();
        } else {
          this.notify.error('Failed to add preferred campus.');
        }
      },
      error: (error: unknown) => {
        console.error('CompanyHomeComponent: Error in add preferred campus subscription:', error);
        this.submittingPreferredCampusForm = false;
        this.notify.error('An error occurred while adding the preferred campus.');
      }
    });
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


