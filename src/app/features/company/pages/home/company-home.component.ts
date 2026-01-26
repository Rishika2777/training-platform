import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, OnInit, signal, ViewChild } from '@angular/core';
import { CarouselComponent } from '../../../../shared/components/carousel/carousel.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ModalService } from '../../../../core/modal/modal.service';
import { CompanySpecializationComponent } from '../specialization/company-specialization.component';
import { CompanyVisionPerformanceComponent } from '../vision-performance/company-vision-performance.component';
import { CompanyBenefitsComponent, BenefitsFormValue } from '../benefits/company-benefits.component';
import { CompanyCurrentVacancyComponent, CurrentVacancyFormValue } from '../current-vacancy/company-current-vacancy.component';
import { CompanyClientFormComponent, ClientFormValue } from '../client-form/company-client-form.component';
import { CompanyPreferredCampusFormComponent, PreferredCampusFormValue } from '../preferred-campus-form/company-preferred-campus-form.component';
import { SpecializationFormValue } from '../specialization/company-specialization.component';
import { CompanyApiService, KeyPersonResponse, PreferredCampusResponse, PreferredCampusRequest, ClientResponse, ClientRequest, VacancyRequest, VacancyResponse, TechnologyRequest, TechnologyResponse, BenefitsOfferRequest, BenefitsOfferResponse } from '../../services/company-api.service';
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

  // Track previous modal states for form reset
  private clientFormModalWasOpen = false;
  private preferredCampusFormModalWasOpen = false;

  @ViewChild(CompanySpecializationComponent) specializationComponent?: CompanySpecializationComponent;

  submittingSpecialization = false;
  submittingVisionPerformance = false;
  submittingBenefits = false;
  submittingCurrentVacancy = false;
  submittingClientForm = false;
  submittingPreferredCampusForm = false;
  readonly announcementDate = 'January 7th, 2025';

  // Form values for reset functionality
  clientFormValue: ClientFormValue = {
    logo: null,
    clientName: '',
  };

  preferredCampusFormValue: PreferredCampusFormValue = {
    photo: null,
    campusName: '',
    campusId: undefined,
  };

  // Key People - API Integration
  readonly keyPeople = signal<readonly PersonCard[]>([]);
  readonly loadingKeyPeople = signal(false);

  // Clients - API Integration
  readonly clients = signal<ImageTile[]>([]);
  readonly loadingClients = signal(false);
  clientsPage = 0;
  readonly clientsPageSize = 10; // API page size
  readonly clientsTotalPages = signal(1);
  // Carousel pagination for clients (3 items per page)
  clientsCarouselPage = 1;
  readonly clientsCarouselPageSize = 3;

  // Preferred Campuses - API Integration
  readonly preferredCampuses = signal<ImageTile[]>([]);
  readonly loadingPreferredCampuses = signal(false);
  // Carousel pagination for preferred campuses (3 items per page)
  preferredCampusesCarouselPage = 1;
  readonly preferredCampusesCarouselPageSize = 3;

  // Specializations - API Integration
  readonly specializations = signal<readonly TechnologyResponse[]>([]);
  readonly loadingSpecializations = signal(false);
  // Carousel pagination for specializations (3 items per page)
  specializationsCarouselPage = 1;
  readonly specializationsCarouselPageSize = 3;

  // Vacancies
  readonly vacancies = signal<readonly VacancyResponse[]>([]);
  readonly loadingVacancies = signal(false);
  vacanciesPage = 0;
  readonly vacanciesPageSize = 10;

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

  get preferredCampusesTotalPages(): number {
    return totalPages(this.preferredCampuses().length, this.preferredCampusesCarouselPageSize);
  }

  preferredCampusesPageItems(): readonly ImageTile[] {
    return slicePage(this.preferredCampuses(), this.preferredCampusesCarouselPage, this.preferredCampusesCarouselPageSize);
  }

  get clientsCarouselTotalPages(): number {
    return totalPages(this.clients().length, this.clientsCarouselPageSize);
  }

  clientsCarouselPageItems(): readonly ImageTile[] {
    return slicePage(this.clients(), this.clientsCarouselPage, this.clientsCarouselPageSize);
  }

  get specializationsTotalPages(): number {
    return totalPages(this.specializations().length, this.specializationsCarouselPageSize);
  }

  specializationsPageItems(): readonly ImageTile[] {
    return this.specializations().map((tech, index) => {
      let imageUrl: string | null = null;
      if (tech.iconUrl) {
        // If iconUrl is already a full URL, use it as is
        if (tech.iconUrl.startsWith('http://') || tech.iconUrl.startsWith('https://')) {
          imageUrl = tech.iconUrl;
        } else {
          // Otherwise, construct the full URL using the API base path
          imageUrl = `/api/v1/files/${tech.iconUrl}`;
        }
      }
      return {
        id: tech.technologyId || `tech-${index}`,
        imageUrl,
        alt: tech.technologyName || 'Technology',
      };
    });
  }

  specializationsCarouselPageItems(): readonly ImageTile[] {
    return slicePage(this.specializationsPageItems(), this.specializationsCarouselPage, this.specializationsCarouselPageSize);
  }

  get companyId(): string | null {
  return this.getCompanyId();
}


  ngOnInit(): void {
    this.loadKeyPeople();
    this.loadPreferredCampuses();
    this.loadClients();
    this.loadSpecializations();
    this.loadVacancies();

    // Watch for modal state changes to reset forms
    effect(() => {
      const isClientModalOpen = this.isClientFormModalOpen();
      if (isClientModalOpen && !this.clientFormModalWasOpen) {
        // Reset client form when modal opens
        this.clientFormValue = {
          logo: null,
          clientName: '',
        };
      }
      this.clientFormModalWasOpen = isClientModalOpen;
    });

    effect(() => {
      const isPreferredCampusModalOpen = this.isPreferredCampusFormModalOpen();
      if (isPreferredCampusModalOpen && !this.preferredCampusFormModalWasOpen) {
        // Reset preferred campus form when modal opens
        this.preferredCampusFormValue = {
          photo: null,
          campusName: '',
          campusId: undefined,
        };
      }
      this.preferredCampusFormModalWasOpen = isPreferredCampusModalOpen;
    });
  }

  private getCompanyId(): string | null {
    // Try from auth state (user profile) - companyId from login response
    const currentUser = this.authState.user();
    console.log('CompanyHomeComponent: Current user from auth state:', currentUser);
    const companyIdFromUser = currentUser?.companyId;
    console.log('CompanyHomeComponent: companyId from user:', companyIdFromUser);
    if (companyIdFromUser) {
      // Also store it in storage for consistency
      this.storage.set(STORAGE_KEYS.COMPANY_ID, companyIdFromUser);
      return companyIdFromUser;
    }
    
    // Try from storage
    const companyIdFromStorage = this.storage.get(STORAGE_KEYS.COMPANY_ID) as string | null;
    console.log('CompanyHomeComponent: companyId from storage:', companyIdFromStorage);
    if (companyIdFromStorage) {
      return companyIdFromStorage;
    }
    
    // Additional fallback: check if userType is COMPANY and try to get from profileServiceId
    if (currentUser?.userType === 'COMPANY' && currentUser?.profileServiceId) {
      console.log('CompanyHomeComponent: Using profileServiceId as companyId fallback:', currentUser.profileServiceId);
      this.storage.set(STORAGE_KEYS.COMPANY_ID, currentUser.profileServiceId);
      return currentUser.profileServiceId;
    }
    
    console.error('CompanyHomeComponent: No companyId found in user object or storage. User:', currentUser);
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
        const mappedCampuses: ImageTile[] = response.map((campus, index) => {
          // Handle image URL - construct full URL from filename
          let imageUrl = campus.campusLogoUrl || null;
          if (imageUrl) {
            // Check if it's already a full URL
            if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
              // Already a full URL, use as-is
              // No modification needed
            } else if (imageUrl.startsWith('/')) {
              // Absolute path - construct full URL
              imageUrl = `/api/v1/files${imageUrl}`;
            } else if (imageUrl.startsWith('assets/')) {
              // Asset path, use as-is
              // No modification needed
            } else {
              // Relative filename - construct full URL using /api/v1/files/ pattern
              imageUrl = `/api/v1/files/${imageUrl}`;
            }
          }
          return {
            id: campus.campusId || `campus-${index}`, // Unique ID for tracking
            imageUrl: imageUrl || 'assets/images/landing-card-campus.png',
          alt: campus.campusName || 'Preferred campus',
          };
        });
        this.preferredCampuses.set(mappedCampuses);
        // Reset to first page when data loads
        this.preferredCampusesCarouselPage = 1;
      },
      error: (error: unknown) => {
        console.error('CompanyHomeComponent: Error in preferred campuses subscription:', error);
        this.loadingPreferredCampuses.set(false);
        this.preferredCampuses.set([]);
      }
    });
  }

  loadVacancies(): void {
    const companyId = this.getCompanyId();
    if (!companyId) {
      console.warn('CompanyHomeComponent: No company ID available, cannot load vacancies');
      return;
    }

    this.loadingVacancies.set(true);
    this.companyApi.getVacancies(companyId, this.vacanciesPage, this.vacanciesPageSize).pipe(
      catchError((error) => {
        console.error('CompanyHomeComponent: Error loading vacancies:', error);
        this.loadingVacancies.set(false);
        return of([]);
      })
    ).subscribe({
      next: (response: readonly VacancyResponse[]) => {
        this.loadingVacancies.set(false);
        console.log('CompanyHomeComponent: Vacancies loaded successfully', response);
        this.vacancies.set(response);
      },
      error: (error: unknown) => {
        console.error('CompanyHomeComponent: Error in vacancies subscription:', error);
        this.loadingVacancies.set(false);
        this.vacancies.set([]);
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
        const mappedClients: ImageTile[] = response.map((client, index) => {
          // Handle image URL - construct full URL from filename
          let imageUrl = client.photourl || null;
          if (imageUrl) {
            // Check if it's already a full URL
            if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
              // Already a full URL, use as-is
              // No modification needed
            } else if (imageUrl.startsWith('/')) {
              // Absolute path - construct full URL
              imageUrl = `/api/v1/files${imageUrl}`;
            } else if (imageUrl.startsWith('assets/')) {
              // Asset path, use as-is
              // No modification needed
            } else {
              // Relative filename - construct full URL using /api/v1/files/ pattern
              imageUrl = `/api/v1/files/${imageUrl}`;
            }
          }
          return {
            id: client.clientId || `client-${index}`, // Unique ID for tracking
            imageUrl: imageUrl, // Show image if available, otherwise null
          alt: client.clientName || 'Client',
          };
        });
        this.clients.set(mappedClients);
        // Reset to first page when data loads
        this.clientsCarouselPage = 1;
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
      next: (response: readonly TechnologyResponse[]) => {
        this.loadingSpecializations.set(false);
        this.specializations.set(response);
        this.specializationsCarouselPage = 1;
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

  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.style.display = 'none';
      const placeholder = img.nextElementSibling as HTMLElement;
      if (placeholder && placeholder.classList) {
        placeholder.style.display = 'block';
      }
    }
  }
   
  handleSpecializationSubmit(value: SpecializationFormValue): void {
    console.log('CompanyHomeComponent: ========== SPECIALIZATION FORM SUBMITTED ==========');
    console.log('CompanyHomeComponent: Form value:', value);
    
    // Initialize submitting state
    this.submittingSpecialization = true;
    
    const companyId = this.getCompanyId();
    console.log('CompanyHomeComponent: Company ID:', companyId);
    if (!companyId) {
      console.warn('CompanyHomeComponent: No company ID available, cannot submit specialization');
      this.notify.error('Unable to submit. Company ID not found.');
      this.submittingSpecialization = false;
      return;
    }

    // Filter valid technologies
    const validTechnologies = value.technologies.filter(tech => 
      tech.technologyName.trim().length > 0 && 
      tech.description.trim().length > 0 && 
      tech.icon !== null
    );
    
    console.log('CompanyHomeComponent: Valid technologies count:', validTechnologies.length);
    if (validTechnologies.length === 0) {
      this.notify.error('Please add at least one valid technology with name, description, and icon.');
      this.submittingSpecialization = false;
      return;
    }

    console.log('CompanyHomeComponent: Making API calls to add technologies', { companyId, count: validTechnologies.length });

    // Add each technology one by one
    let completed = 0;
    let hasError = false;

    validTechnologies.forEach((tech, index) => {
      // Build request according to API spec: { technologyName, description, iconUrl }
      const request: TechnologyRequest = {
        technologyName: tech.technologyName.trim(),
        description: tech.description.trim(),
        iconUrl: tech.icon ? tech.icon.name : undefined, // Use filename as iconUrl
      };

      console.log(`CompanyHomeComponent: ========== CALLING API FOR TECHNOLOGY ${index + 1} ==========`);
      console.log(`CompanyHomeComponent: Request payload:`, request);
      console.log(`CompanyHomeComponent: Calling companyApi.addTechnology for technology ${index + 1}...`);
      
      const subscription = this.companyApi.addTechnology(companyId, request).pipe(
        catchError((error) => {
          console.error(`CompanyHomeComponent: ========== ERROR ADDING TECHNOLOGY ${index + 1} ==========`);
          console.error(`CompanyHomeComponent: Error details:`, error);
          hasError = true;
          
          // Handle different error types
          if (error?.status === 500) {
            const errorMessage = error?.error?.message || 'Server error occurred. Please try again.';
            this.notify.error(`Failed to add technology "${tech.technologyName}": ${errorMessage}`);
          } else if (error?.status === 502 || error?.error?.message?.includes('Upstream service URL not configured')) {
            this.notify.error('Backend service not configured. Please contact administrator.');
          } else {
            const errorMessage = error?.error?.message || 'Failed to add technology. Please try again.';
            this.notify.error(`Failed to add technology "${tech.technologyName}": ${errorMessage}`);
          }
          
          return of(null);
        })
      ).subscribe({
        next: (response: TechnologyResponse | null) => {
          completed++;
          console.log(`CompanyHomeComponent: ========== TECHNOLOGY ${index + 1} ADDED SUCCESSFULLY ==========`);
          console.log(`CompanyHomeComponent: Response:`, response);
          
          if (completed === validTechnologies.length) {
            this.submittingSpecialization = false;
            if (!hasError) {
              this.notify.success('All technologies added successfully!');
              // Reload the list to show updated data
              this.loadSpecializations();
              // Reset form to clear fields
              if (this.specializationComponent) {
                this.specializationComponent.resetForm();
              }
              // Don't close modal - let user see the updated list
            } else {
              this.notify.error('Some technologies failed to add. Please check the errors above.');
            }
          }
        },
        error: (error: unknown) => {
          console.error(`CompanyHomeComponent: ========== SUBSCRIPTION ERROR FOR TECHNOLOGY ${index + 1} ==========`);
          console.error(`CompanyHomeComponent: Error:`, error);
          completed++;
          hasError = true;
          
          if (completed === validTechnologies.length) {
            this.submittingSpecialization = false;
            this.notify.error('An error occurred while adding technologies.');
          }
        }
      });
      
      console.log(`CompanyHomeComponent: Subscription created for technology ${index + 1}, subscription object:`, subscription);
    });
  }

  handleDeleteSpecialization(technologyId: string): void {
    console.log('CompanyHomeComponent: ========== DELETE SPECIALIZATION REQUESTED ==========');
    console.log('CompanyHomeComponent: Technology ID:', technologyId);
    
    const companyId = this.getCompanyId();
    if (!companyId) {
      console.warn('CompanyHomeComponent: No company ID available, cannot delete specialization');
      this.notify.error('Unable to delete. Company ID not found.');
      return;
    }

    if (!technologyId) {
      console.warn('CompanyHomeComponent: No technology ID provided');
      this.notify.error('Unable to delete. Technology ID not found.');
      return;
    }

    // Set deleting state in child component
    if (this.specializationComponent) {
      this.specializationComponent.deletingTechnologyId = technologyId;
    }

    console.log('CompanyHomeComponent: Calling companyApi.deleteTechnology...', { companyId, technologyId });
    
    this.companyApi.deleteTechnology(companyId, technologyId).pipe(
      catchError((error) => {
        console.error('CompanyHomeComponent: ========== ERROR DELETING TECHNOLOGY ==========');
        console.error('CompanyHomeComponent: Error details:', error);
        
        // Clear deleting state
        if (this.specializationComponent) {
          this.specializationComponent.deletingTechnologyId = null;
        }
        
        // Handle different error types
        if (error?.status === 500) {
          const errorMessage = error?.error?.message || 'Server error occurred. Please try again.';
          this.notify.error(`Failed to delete technology: ${errorMessage}`);
        } else if (error?.status === 502 || error?.error?.message?.includes('Upstream service URL not configured')) {
          this.notify.error('Backend service not configured. Please contact administrator.');
        } else {
          const errorMessage = error?.error?.message || 'Failed to delete technology. Please try again.';
          this.notify.error(errorMessage);
        }
        return of(false);
      })
    ).subscribe({
      next: (success: boolean) => {
        console.log('CompanyHomeComponent: ========== TECHNOLOGY DELETED SUCCESSFULLY ==========');
        console.log('CompanyHomeComponent: Delete success:', success);
        
        // Clear deleting state
        if (this.specializationComponent) {
          this.specializationComponent.deletingTechnologyId = null;
        }
        
        if (success) {
          this.notify.success('Technology deleted successfully!');
          // Reload the list to show updated data
          this.loadSpecializations();
        } else {
          this.notify.error('Failed to delete technology. Please try again.');
        }
      },
      error: (error: unknown) => {
        console.error('CompanyHomeComponent: ========== SUBSCRIPTION ERROR ==========');
        console.error('CompanyHomeComponent: Error:', error);
        
        // Clear deleting state
        if (this.specializationComponent) {
          this.specializationComponent.deletingTechnologyId = null;
        }
        
        this.notify.error('An error occurred while deleting the technology.');
      }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleVisionPerformanceSubmit(_value: unknown): void {
    this.submittingVisionPerformance = true;
    // TODO: Call API service
  }

  handleBenefitsSubmit(value: BenefitsFormValue): void {
    console.log('CompanyHomeComponent: Benefits form submitted', value);
    const companyId = this.getCompanyId();
    if (!companyId) {
      console.warn('CompanyHomeComponent: No company ID available, cannot submit benefits offer');
      this.notify.error('Unable to submit. Company ID not found.');
      this.submittingBenefits = false;
      return;
    }

    // Map form values to API request format
    // Note: Form uses workLifeBalance and trainingUpskilling, but API expects workLifeBalancePerks and trainingAndUpskilling
  const request: BenefitsOfferRequest = {
  internToJobRate: value.internToJobRate.trim() || '',
  startingSalaryRange: value.startingSalaryRange.trim() || '',
  performanceBonus: value.performanceBonus.trim() || '',
  healthcare: value.healthcare.trim() || '',
  mentorBuddySystem: value.mentorBuddySystem.trim() || '',
  workLifeBalancePerks: value.workLifeBalancePerks.trim() || '',
  appreciationDayOff: value.appreciationDayOff.trim() || '',
  trainingAndUpskilling: value.trainingAndUpskilling.trim() || '',
  sickLeaves: value.sickLeaves.trim() || '',
  referralBonus: value.referralBonus.trim() || '',
};

    console.log('CompanyHomeComponent: Making API call to add benefits offer', { companyId, request });
    this.submittingBenefits = true;
    
    this.companyApi.addBenefitsOffer(companyId, request).pipe(
      catchError((error) => {
        console.error('CompanyHomeComponent: Error adding benefits offer:', error);
        this.submittingBenefits = false;
        
        // Handle different error types
        if (error?.status === 500) {
          const errorMessage = error?.error?.message || 'Server error occurred. Please try again.';
          this.notify.error(errorMessage);
        } else if (error?.status === 502 || error?.error?.message?.includes('Upstream service URL not configured')) {
          this.notify.error('Backend service not configured. Please contact administrator.');
        } else {
          const errorMessage = error?.error?.message || 'Failed to submit benefits offer. Please try again.';
          this.notify.error(errorMessage);
        }
        return of(null);
      })
    ).subscribe({
      next: (response: BenefitsOfferResponse | null) => {
        console.log('CompanyHomeComponent: Subscription next() called', response);
        this.submittingBenefits = false;
        if (response) {
          this.notify.success('Your offered benefits package has been successfully submitted!');
          this.closeModal();
        } else {
          // Response is null - error was already handled in catchError
        }
      },
      error: (error: unknown) => {
        console.error('CompanyHomeComponent: Error in add benefits offer subscription:', error);
        this.submittingBenefits = false;
        
        // Check if it's a 502 error (backend service not configured)
        if (error && typeof error === 'object' && 'status' in error) {
          const httpError = error as { status?: number; error?: { message?: string } };
          if (httpError.status === 502 || httpError.error?.message?.includes('Upstream service URL not configured')) {
            this.notify.error('Backend service not configured. Please contact administrator.');
          } else {
            this.notify.error('An error occurred while submitting the benefits offer.');
          }
        } else {
          this.notify.error('An error occurred while submitting the benefits offer.');
        }
      }
    });
  }

  handleCurrentVacancySubmit(value: CurrentVacancyFormValue): void {
    console.log('CompanyHomeComponent: ========== CURRENT VACANCY FORM SUBMITTED ==========');
    console.log('CompanyHomeComponent: Form value:', value);
    
    // Initialize submitting state
    this.submittingCurrentVacancy = true;
    
    const companyId = this.getCompanyId();
    console.log('CompanyHomeComponent: Company ID:', companyId);
    if (!companyId) {
      const currentUser = this.authState.user();
      console.error('CompanyHomeComponent: No company ID available, cannot submit vacancy');
      console.error('CompanyHomeComponent: Current user:', currentUser);
      console.error('CompanyHomeComponent: User type:', currentUser?.userType);
      console.error('CompanyHomeComponent: CompanyId from user:', currentUser?.companyId);
      console.error('CompanyHomeComponent: ProfileServiceId from user:', currentUser?.profileServiceId);
      console.error('CompanyHomeComponent: CompanyId from storage:', this.storage.get(STORAGE_KEYS.COMPANY_ID));
      
      this.notify.error('Unable to submit. Company ID not found. Please log out and log back in, or contact support if the issue persists.');
      this.submittingCurrentVacancy = false;
      return;
    }

    // Validate required fields
    if (!value.jobTitle || !value.jobTitle.trim()) {
      this.notify.error('Please select a job title.');
      this.submittingCurrentVacancy = false;
      return;
    }

    if (!value.jobType || !value.jobType.trim()) {
      this.notify.error('Please select a job type.');
      this.submittingCurrentVacancy = false;
      return;
    }

    if (!value.jobLocation || !value.jobLocation.trim()) {
      this.notify.error('Please select a job location.');
      this.submittingCurrentVacancy = false;
      return;
    }

    if (!value.department || !value.department.trim()) {
      this.notify.error('Please select a department.');
      this.submittingCurrentVacancy = false;
      return;
    }

    // Validate job description - backend likely requires this field
    if (!value.jobDescription || !value.jobDescription.trim()) {
      this.notify.error('Please enter a job description.');
      this.submittingCurrentVacancy = false;
      return;
    }

    // Validate year of passing - backend likely requires this field
    if (!value.yearOfPassing || !value.yearOfPassing.trim()) {
      this.notify.error('Please select a year of passing.');
      this.submittingCurrentVacancy = false;
      return;
    }

    // Validate minimum CGPA - backend likely requires this field
    if (!value.minimumCGPA || !value.minimumCGPA.trim()) {
      this.notify.error('Please enter a minimum CGPA/percentage.');
      this.submittingCurrentVacancy = false;
      return;
    }

    console.log('CompanyHomeComponent: Making API call to add vacancy', { companyId, value });
    
    // Map form values to API request format
    // Convert selection rounds to array
    const selectionProcess: string[] = [];
    if (value.selectionRounds.aptitudeTest) selectionProcess.push('Aptitude Test');
    if (value.selectionRounds.groupDiscussion) selectionProcess.push('Group Discussion');
    if (value.selectionRounds.faceToFace) selectionProcess.push('Face To Face');
    if (value.selectionRounds.all) selectionProcess.push('All');

    // Validate selection process - backend requires at least one selection round
    if (selectionProcess.length === 0) {
      this.notify.error('Please select at least one selection round.');
      this.submittingCurrentVacancy = false;
      return;
    }

    // Convert mode of selection to a single string (backend expects string, not array)
    // Priority: "Both" > "Online" > "Offline" (if multiple selected, use "Both" if available)
    let interviewMode = '';
    if (value.modeOfSelection.both) {
      interviewMode = 'Both';
    } else if (value.modeOfSelection.online) {
      interviewMode = 'Online';
    } else if (value.modeOfSelection.offline) {
      interviewMode = 'Offline';
    }

    // Validate interview mode - backend requires a mode to be selected
    if (!interviewMode || interviewMode.trim() === '') {
      this.notify.error('Please select a mode of selection.');
      this.submittingCurrentVacancy = false;
      return;
    }

    // Ensure interviewMode is a non-empty string
    interviewMode = interviewMode.trim();
    console.log('CompanyHomeComponent: interviewMode value:', interviewMode);

    // Map dropdown values to labels for API (backend expects display labels, not internal values)
    const qualificationsItems = [
      { label: 'B.Tech', value: 'btech' },
      { label: 'M.Tech', value: 'mtech' },
      { label: 'B.Sc', value: 'bsc' },
      { label: 'M.Sc', value: 'msc' },
    ];
    const streamsItems = [
      { label: 'Computer Science', value: 'cs' },
      { label: 'Electronics', value: 'electronics' },
      { label: 'Electrical', value: 'electrical' },
      { label: 'Mechanical', value: 'mechanical' },
    ];
    const jobTitleItems = [
      { label: 'Software Engineer', value: 'software-engineer' },
      { label: 'Product Manager', value: 'product-manager' },
      { label: 'Data Analyst', value: 'data-analyst' },
      { label: 'UI/UX Designer', value: 'ui-ux-designer' },
    ];
    const jobTypeItems = [
      { label: 'Full-time', value: 'full-time' },
      { label: 'Part-time', value: 'part-time' },
      { label: 'Contract', value: 'contract' },
      { label: 'Internship', value: 'internship' },
    ];
    const jobLocationItems = [
      { label: 'Remote', value: 'remote' },
      { label: 'Hybrid', value: 'hybrid' },
      { label: 'On-site', value: 'on-site' },
    ];
    const departmentItems = [
      { label: 'Engineering', value: 'engineering' },
      { label: 'Product', value: 'product' },
      { label: 'Design', value: 'design' },
      { label: 'Marketing', value: 'marketing' },
    ];
    const contractDurationItems = [
      { label: '6 months', value: '6-months' },
      { label: '1 year', value: '1-year' },
      { label: '2 years', value: '2-years' },
      { label: 'Permanent', value: 'permanent' },
    ];
    
    // Convert qualifications to array of strings (as per backend API - REQUEST format)
    // Backend REQUEST expects: ["Bachelor's Degree", "Master's Degree"] (array of strings)
    // Map dropdown values to their labels - ensure we find the label
    const qualificationItem = qualificationsItems.find(item => item.value === value.requiredQualifications);
    if (!qualificationItem) {
      this.notify.error('Invalid qualification selected. Please select a valid qualification.');
      this.submittingCurrentVacancy = false;
      return;
    }
    const requiredqualifications: string[] = [qualificationItem.label];
    
    // Convert streams to array of strings - map to labels - ensure we find the label
    const streamItem = streamsItems.find(item => item.value === value.streamsEligible);
    if (!streamItem) {
      this.notify.error('Invalid stream selected. Please select a valid stream.');
      this.submittingCurrentVacancy = false;
      return;
    }
    const streamseligible: string[] = [streamItem.label];
    
    // Map other dropdown values to labels - ensure we find the label, don't fall back to value
    const jobTitleItem = jobTitleItems.find(item => item.value === value.jobTitle);
    if (!jobTitleItem) {
      this.notify.error('Invalid job title selected. Please select a valid job title.');
      this.submittingCurrentVacancy = false;
      return;
    }
    const jobTitleLabel = jobTitleItem.label;

    const jobTypeItem = jobTypeItems.find(item => item.value === value.jobType);
    if (!jobTypeItem) {
      this.notify.error('Invalid job type selected. Please select a valid job type.');
      this.submittingCurrentVacancy = false;
      return;
    }
    const jobTypeLabel = jobTypeItem.label;

    const jobLocationItem = jobLocationItems.find(item => item.value === value.jobLocation);
    if (!jobLocationItem) {
      this.notify.error('Invalid job location selected. Please select a valid job location.');
      this.submittingCurrentVacancy = false;
      return;
    }
    const jobLocationLabel = jobLocationItem.label;

    const departmentItem = departmentItems.find(item => item.value === value.department);
    if (!departmentItem) {
      this.notify.error('Invalid department selected. Please select a valid department.');
      this.submittingCurrentVacancy = false;
      return;
    }
    const departmentLabel = departmentItem.label;

    // Map contract duration to label (backend expects "6 months" not "6-months")
    let contractDurationLabel = '';
    if (value.contractDuration && value.contractDuration.trim()) {
      const contractDurationItem = contractDurationItems.find(item => item.value === value.contractDuration);
      if (contractDurationItem) {
        contractDurationLabel = contractDurationItem.label;
      } else {
        // If not found in mapping, use the value as-is (might be already formatted)
        contractDurationLabel = value.contractDuration.trim();
      }
    }

    // Validate required qualifications - backend requires at least one qualification
    if (requiredqualifications.length === 0) {
      this.notify.error('Please select at least one required qualification.');
      this.submittingCurrentVacancy = false;
      return;
    }

    // Validate streams eligible - backend requires at least one stream
    if (streamseligible.length === 0) {
      this.notify.error('Please select at least one stream eligible.');
      this.submittingCurrentVacancy = false;
      return;
    }

    // Build request according to API spec (matching backend format from image)
    // Backend REQUEST expects requiredQualifications as array of strings: ["Bachelor's Degree"]
    // All required fields are validated above, so we can safely build the request
    const request: VacancyRequest = {
      jobTitle: jobTitleLabel.trim(),
      jobLocation: jobLocationLabel.trim(),
      department: departmentLabel.trim(),
      jobType: jobTypeLabel.trim(),
      salary: value.salary?.trim() || '', // Salary can be empty string if not provided
      numberOfOpenings: value.numberOfOpenings?.trim() || '', // Backend uses camelCase (dropdown values match labels)
      contractDuration: contractDurationLabel, // Backend expects label format like "6 months" not "6-months"
      jobDescription: value.jobDescription.trim(), // Backend uses camelCase (validated above, non-empty)
      requiredQualifications: requiredqualifications, // Backend REQUEST expects array of strings (non-empty, validated above)
      streamsEligible: streamseligible, // Backend uses plural "streamsEligible" (matching request/response format)
      minimumCgpaPercentage: value.minimumCGPA.trim(), // Backend uses camelCase (validated above, non-empty)
      yearOfPassing: value.yearOfPassing.trim(), // Backend uses camelCase (validated above, non-empty)
      selectionProcess: selectionProcess, // Non-empty array (validated above)
      interviewMode: interviewMode, // Single string value: "Both", "Online", or "Offline" (validated above, non-empty)
    };

    // Verify interviewMode is included in the request
    console.log('CompanyHomeComponent: ========== REQUEST OBJECT VERIFICATION ==========');
    console.log('CompanyHomeComponent: interviewMode in request:', request.interviewMode);
    console.log('CompanyHomeComponent: interviewMode type:', typeof request.interviewMode);
    console.log('CompanyHomeComponent: interviewMode length:', request.interviewMode?.length);
    
    // Log the final request payload for debugging
    console.log('CompanyHomeComponent: Final request payload:', JSON.stringify(request, null, 2));
    
    // Verify all required fields are present
    const requiredFields = ['jobTitle', 'jobLocation', 'department', 'jobType', 'jobDescription', 
                           'requiredQualifications', 'streamsEligible', 'minimumCgpaPercentage', 
                           'yearOfPassing', 'selectionProcess', 'interviewMode'];
    const missingFields = requiredFields.filter(field => !(field in request) || 
      (Array.isArray(request[field as keyof VacancyRequest]) ? 
        (request[field as keyof VacancyRequest] as string[]).length === 0 : 
        !request[field as keyof VacancyRequest] || 
        (typeof request[field as keyof VacancyRequest] === 'string' && 
         (request[field as keyof VacancyRequest] as string).trim() === '')));
    
    if (missingFields.length > 0) {
      console.error('CompanyHomeComponent: Missing or empty required fields:', missingFields);
      this.notify.error(`Missing required fields: ${missingFields.join(', ')}`);
      this.submittingCurrentVacancy = false;
      return;
    }
    
    console.log('CompanyHomeComponent: All required fields are present and valid');

    console.log('CompanyHomeComponent: ========== CALLING API TO ADD VACANCY ==========');
    console.log('CompanyHomeComponent: Request payload:', request);
    console.log('CompanyHomeComponent: Calling companyApi.addVacancy...');
    const apiCall = this.companyApi.addVacancy(companyId, request);
    console.log('CompanyHomeComponent: API call Observable created, setting up pipe and subscribe...');
    
    const subscription = apiCall.pipe(
      catchError((error) => {
        console.error('CompanyHomeComponent: ========== ERROR ADDING VACANCY ==========');
        console.error('CompanyHomeComponent: Error details:', error);
        this.submittingCurrentVacancy = false;
        
        // Handle different error types
        if (error?.status === 500) {
          const errorMessage = error?.error?.message || 'Server error occurred. Please try again.';
          this.notify.error(errorMessage);
        } else if (error?.status === 502 || error?.error?.message?.includes('Upstream service URL not configured')) {
          this.notify.error('Backend service not configured. Please contact administrator.');
        } else {
          const errorMessage = error?.error?.message || 'Failed to add vacancy. Please try again.';
          this.notify.error(errorMessage);
        }
        return of(null);
      })
    ).subscribe({
      next: (response: VacancyResponse | null) => {
        console.log('CompanyHomeComponent: ========== VACANCY ADDED SUCCESSFULLY ==========');
        console.log('CompanyHomeComponent: Response:', response);
        this.submittingCurrentVacancy = false;
        if (response) {
          this.notify.success('Vacancy added successfully!');
          // Reload vacancies after successful submission
          this.loadVacancies();
          this.modalService.closeModal();
        } else {
          // Response is null - error was already handled in catchError
        }
      },
      error: (error: unknown) => {
        console.error('CompanyHomeComponent: ========== SUBSCRIPTION ERROR ==========');
        console.error('CompanyHomeComponent: Error:', error);
        this.submittingCurrentVacancy = false;
        
        // Check if it's a 502 error (backend service not configured)
        if (error && typeof error === 'object' && 'status' in error) {
          const httpError = error as { status?: number; error?: { message?: string } };
          if (httpError.status === 502 || httpError.error?.message?.includes('Upstream service URL not configured')) {
            this.notify.error('Backend service not configured. Please contact administrator.');
          } else {
            this.notify.error('An error occurred while adding the vacancy.');
          }
        } else {
          this.notify.error('An error occurred while adding the vacancy.');
        }
      }
    });
    
    console.log('CompanyHomeComponent: Subscription created, subscription object:', subscription);
  }

   handleClientFormSubmit(value: ClientFormValue): void {
    console.log('CompanyHomeComponent: Client form submitted', value);
    const companyId = this.getCompanyId();
    if (!companyId) {
      console.warn('CompanyHomeComponent: No company ID available, cannot submit client');
      this.notify.error('Unable to submit. Company ID not found.');
      this.submittingClientForm = false;
      return;
    }

    if (!value.clientName || !value.clientName.trim()) {
      console.warn('CompanyHomeComponent: Client name is required');
      this.notify.error('Please enter a client name.');
      this.submittingClientForm = false;
      return;
    }

    console.log('CompanyHomeComponent: Making API call to add client', { companyId, clientName: value.clientName, hasLogo: !!value.logo });
    this.submittingClientForm = true;
    
    // Build request according to API spec: { clientName, photourl }
    // Backend might be rejecting photourl if it's just a filename (not a URL)
    // So we'll omit photourl entirely if it's not a valid URL
    const request: ClientRequest = {
      clientName: value.clientName.trim(),
    };
    
    // Only include photourl if it's a valid URL
    // If logo is a File object, we can't send it as photourl (which expects a URL string)
    // Backend might handle file upload separately or expect photourl to be a pre-uploaded URL
    // For now, omit photourl if it's not a valid URL to avoid 500 errors
    // TODO: If backend requires file upload, implement file upload first, then send the returned URL as photourl

    console.log('CompanyHomeComponent: Calling companyApi.addClient...', request);
    const apiCall = this.companyApi.addClient(companyId, request);
    console.log('CompanyHomeComponent: API call Observable created, setting up pipe and subscribe...');
    
    apiCall.pipe(
      catchError((error) => {
        console.error('CompanyHomeComponent: Error adding client:', error);
        this.submittingClientForm = false;
        
        // Handle different error types
        if (error?.status === 500) {
          const errorMessage = error?.error?.message || 'Server error occurred. Please try again.';
          this.notify.error(errorMessage);
        } else if (error?.status === 502 || error?.error?.message?.includes('Upstream service URL not configured')) {
          this.notify.error('Backend service not configured. Please contact administrator.');
        } else {
          const errorMessage = error?.error?.message || 'Failed to add client. Please try again.';
          this.notify.error(errorMessage);
        }
        return of(null);
      })
    ).subscribe({
      next: (response: ClientResponse | null) => {
        console.log('CompanyHomeComponent: Subscription next() called', response);
        this.submittingClientForm = false;
        if (response) {
          this.notify.success('Client added successfully!');
          // Reset form after successful submission
          this.clientFormValue = {
            logo: null,
            clientName: '',
          };
          this.loadClients(); // Reload the list
          this.modalService.closeModal();
        } else {
          // Response is null - error was already handled in catchError
        }
      },
      error: (error: unknown) => {
        console.error('CompanyHomeComponent: Error in add client subscription:', error);
        this.submittingClientForm = false;
        
        // Check if it's a 502 error (backend service not configured)
        if (error && typeof error === 'object' && 'status' in error) {
          const httpError = error as { status?: number; error?: { message?: string } };
          if (httpError.status === 502 || httpError.error?.message?.includes('Upstream service URL not configured')) {
            this.notify.error('Backend service not configured. Please contact administrator.');
          } else {
            this.notify.error('An error occurred while adding the client.');
          }
        } else {
        this.notify.error('An error occurred while adding the client.');
        }
      }
    });
  }

  handlePreferredCampusFormSubmit(value: PreferredCampusFormValue): void {
    console.log('CompanyHomeComponent: Preferred campus form submitted', value);
    const companyId = this.getCompanyId();
    if (!companyId) {
      console.warn('CompanyHomeComponent: No company ID available, cannot submit preferred campus');
      this.notify.error('Unable to submit. Company ID not found.');
      this.submittingPreferredCampusForm = false;
      return;
    }

    if (!value.campusId) {
      console.warn('CompanyHomeComponent: Campus ID is required');
      this.notify.error('Please select a campus.');
      this.submittingPreferredCampusForm = false;
      return;
    }

    console.log('CompanyHomeComponent: Making API call to add preferred campus', { companyId, campusId: value.campusId, campusName: value.campusName, hasPhoto: !!value.photo });
    this.submittingPreferredCampusForm = true;
    
    // Build request according to API spec: { campusId, campusName, campusLogoUrl }
    const request: PreferredCampusRequest = {
      campusId: value.campusId,
      campusName: value.campusName,
      campusLogoUrl: value.photo ? value.photo.name : undefined, // Use filename as campusLogoUrl
    };

    console.log('CompanyHomeComponent: Calling companyApi.addPreferredCampus...', request);
    const apiCall = this.companyApi.addPreferredCampus(companyId, request);
    console.log('CompanyHomeComponent: API call Observable created, setting up pipe and subscribe...');
    
    apiCall.pipe(
      catchError((error) => {
        console.error('CompanyHomeComponent: Error adding preferred campus:', error);
        this.submittingPreferredCampusForm = false;
        
        // Check if it's a 502 error (backend service not configured)
        if (error?.status === 502 || error?.error?.message?.includes('Upstream service URL not configured')) {
          this.notify.error('Backend service not configured. Please contact administrator.');
        } else {
          this.notify.error('Failed to add preferred campus. Please try again.');
        }
        return of(null);
      })
    ).subscribe({
      next: (response: PreferredCampusResponse | null) => {
        console.log('CompanyHomeComponent: Subscription next() called', response);
        this.submittingPreferredCampusForm = false;
        if (response) {
          this.notify.success('Preferred campus added successfully!');
          // Reset form after successful submission
          this.preferredCampusFormValue = {
            photo: null,
            campusName: '',
            campusId: undefined,
          };
          this.loadPreferredCampuses(); // Reload the list
          this.modalService.closeModal();
        } else {
          // Don't show error here if catchError already handled it
        }
      },
      error: (error: unknown) => {
        console.error('CompanyHomeComponent: Error in add preferred campus subscription:', error);
        this.submittingPreferredCampusForm = false;
        
        // Check if it's a 502 error (backend service not configured)
        if (error && typeof error === 'object' && 'status' in error) {
          const httpError = error as { status?: number; error?: { message?: string } };
          if (httpError.status === 502 || httpError.error?.message?.includes('Upstream service URL not configured')) {
            this.notify.error('Backend service not configured. Please contact administrator.');
          } else {
            this.notify.error('An error occurred while adding the preferred campus.');
          }
        } else {
          this.notify.error('An error occurred while adding the preferred campus.');
        }
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
  id: string; // Unique identifier for tracking
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


