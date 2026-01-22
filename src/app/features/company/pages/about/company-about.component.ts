import { CommonModule,isPlatformBrowser } from '@angular/common';
import { Component, computed, inject, signal, OnInit,PLATFORM_ID } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { CarouselComponent } from '../../../../shared/components/carousel/carousel.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { TextareaComponent } from '../../../../shared/components/textarea/textarea.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ModalService } from '../../../../core/modal/modal.service';
import { CompanyInvitationFormComponent, InvitationFormValue } from '../invitation-form/company-invitation-form.component';
import { CompanyApiService, KeyPersonResponse, CompanyInvitationRequest, CompanyInvitationResponse, TargetCampusResponse, ClientResponse } from '../../services/company-api.service';
import { AuthStateService } from '../../../../core/auth/auth-state.service';
import { StorageService } from '../../../../core/storage/storage.service';
import { STORAGE_KEYS } from '../../../../core/config/app.constants';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { catchError, of } from 'rxjs';

interface TeamMember {
  name: string;
  designation: string;
  image: string;
}

interface Campus {
  name: string;
  image: string;
}

interface Benefit {
  title: string;
  icon: string;
  isOpen: boolean;
}

@Component({
  selector: 'app-company-about',
  standalone: true,
  imports: [
    CommonModule,
    ButtonComponent,
    CarouselComponent,
    InputComponent,
    TextareaComponent,
    ModalComponent,
    CompanyInvitationFormComponent,
  ],
  templateUrl: './company-about.component.html',
  styleUrl: './company-about.component.css',
})
export class CompanyAboutComponent implements OnInit {
  readonly modalService = inject(ModalService);
  private readonly companyApi = inject(CompanyApiService);
  private readonly authState = inject(AuthStateService);
  private readonly storage = inject(StorageService);
  private readonly notify = inject(NotificationService);
  private readonly platformId = inject(PLATFORM_ID);

  // Engagement metrics
  promotions = 25;
  followers = 100;

  // Key People - API Integration
  readonly keyPeople = signal<readonly KeyPersonResponse[]>([]);
  readonly loadingKeyPeople = signal(false);

  // Campus carousel - API Integration
  readonly targetCampuses = signal<readonly TargetCampusResponse[]>([]);
  readonly loadingTargetCampuses = signal(false);
  currentCampusPage = signal(1);

   // ===================== OUR CLIENTS =====================
readonly loadingClients = signal(false);
currentClientPage = signal(1);
totalClientPages = signal(1);

// View-model for template
private _clientViewList: { logo: string }[] = [];

get clientList(): { logo: string }[] {
  return this._clientViewList;
}
 

  get campuses(): Campus[] {
    // Map target campuses from API to campus display format
    return this.targetCampuses().map((campus) => ({
      name: campus.campusName || 'Campus Name',
      image: campus.campusLogo || '/assets/images/campus-placeholder.jpg',
    }));
  }

  // Team members
  ceo = {
    name: 'Ankitha Willson',
    designation: 'CEO',
    image: '/assets/images/ceo-placeholder.jpg',
  };

  get teamMembers(): TeamMember[] {
    // Map key people from API to team members display format
    return this.keyPeople().map((person) => ({
      name: person.name || 'Name',
      designation: person.designation || 'Designation',
      image: person.photoUrl || '/assets/images/team-placeholder.jpg',
    }));
  }

  currentTeamPage = signal(1);

  // Benefits
  internToJobRate = 80;
  benefits: Benefit[] = [
    { title: 'Performance Bonus', icon: '📊', isOpen: false },
    { title: 'Healthcare', icon: '🏥', isOpen: false },
    { title: 'Mentor Buddy System', icon: '👥', isOpen: false },
    { title: 'Work Life Balance Perks', icon: '💼', isOpen: false },
    { title: 'Appreciation Day Off', icon: '🎖️', isOpen: false },
    { title: 'Training & Upskilling', icon: '📈', isOpen: false },
    { title: 'Sick Leaves', icon: '🔒', isOpen: false },
    { title: 'New Employee Referral Bonus', icon: '👨‍👩‍👧', isOpen: false },
  ];

 // Optional: placeholder clients before API loads
readonly placeholderClients: { logo: string }[] = Array(8).fill(null).map((_, i) => ({
  logo: `/assets/images/client-${i + 1}-placeholder.jpg`,
}));

  // Testimonials
  currentTestimonialPage = signal(1);
  testimonials = [
    {
      quote: "I'm grateful for the opportunities and resources provided by the company. It's made a huge difference in my journey.",
      author: 'Ankita Willson',
      image: '/assets/images/testimonial-placeholder.jpg',
    },
  ];

  // Feedback form
  feedbackForm = {
    name: '',
    feedback: '',
    recommendation: '' as 'yes' | 'no' | '',
  };

  // Modal state
  readonly activeModal = computed(() => this.modalService.activeModal());
  readonly isInvitationFormModalOpen = computed(() => this.activeModal() === 'company-invitation-form');

  // Invitation form
  submittingInvitationForm = false;
  invitationFormValue: InvitationFormValue = {
    campusName: '',
    contactPersonName: '',
    contactPersonEmail: '',
    contactPersonPhone: '',
    contactPersonDesignation: '',
    campusWebsiteUrl: '',
    campusAddress: '',
    campusProspectus: null,
    academicYear: '',
    programsOffered: '',
    proposedDate: '',
    preferredSkills: '',
    facilitiesAvailable: '',
    confirmationChecked: false,
  };

  toggleBenefit(index: number): void {
    this.benefits[index].isOpen = !this.benefits[index].isOpen;
  }

  ngOnInit(): void {
    this.loadKeyPeople();
    this.loadTargetCampuses();
    this.loadClients();
  }

  private getCompanyId(): string | null {
    // Try from auth state (user profile) - companyId from login response
    const currentUser = this.authState.user();
    const companyIdFromUser = currentUser?.companyId;
    if (companyIdFromUser) {
      // Also store it in storage for consistency
      this.storage.set(STORAGE_KEYS.COMPANY_ID, companyIdFromUser);
      return companyIdFromUser;
    }
    
    // Try from storage
    const companyIdFromStorage = this.storage.get(STORAGE_KEYS.COMPANY_ID) as string | null;
    if (companyIdFromStorage) {
      return companyIdFromStorage;
    }
    
    // Additional fallback: check if userType is COMPANY and try to get from profileServiceId
    if (currentUser?.userType === 'COMPANY' && currentUser?.profileServiceId) {
      this.storage.set(STORAGE_KEYS.COMPANY_ID, currentUser.profileServiceId);
      return currentUser.profileServiceId;
    }
    
    return null;
  }

  loadKeyPeople(): void {
    const companyId = this.getCompanyId();
    if (!companyId) {
      console.warn('CompanyAboutComponent: No company ID available, cannot load key people');
      return;
    }

    this.loadingKeyPeople.set(true);
    this.companyApi.getKeyPeople(companyId).pipe(
      catchError((error) => {
        console.error('CompanyAboutComponent: Error loading key people:', error);
        this.loadingKeyPeople.set(false);
        return of([]);
      })
    ).subscribe({
      next: (response: readonly KeyPersonResponse[]) => {
        this.loadingKeyPeople.set(false);
        this.keyPeople.set(response);
      },
      error: (error: unknown) => {
        console.error('CompanyAboutComponent: Error in key people subscription:', error);
        this.loadingKeyPeople.set(false);
        this.keyPeople.set([]);
      }
    });
  }

  loadTargetCampuses(): void {
    const companyId = this.getCompanyId();
    if (!companyId) {
      console.warn('CompanyAboutComponent: No company ID available, cannot load target campuses');
      return;
    }

    this.loadingTargetCampuses.set(true);
    this.companyApi.getTargetCampuses(companyId).pipe(
      catchError((error) => {
        console.error('CompanyAboutComponent: Error loading target campuses:', error);
        this.loadingTargetCampuses.set(false);
        return of([]);
      })
    ).subscribe({
      next: (response: readonly TargetCampusResponse[]) => {
        this.loadingTargetCampuses.set(false);
        this.targetCampuses.set(response);
      },
      error: (error: unknown) => {
        console.error('CompanyAboutComponent: Error in target campuses subscription:', error);
        this.loadingTargetCampuses.set(false);
        this.targetCampuses.set([]);
      }
    });
  }

  // ===================== OUR CLIENTS =====================

loadClients(): void {
  if (!isPlatformBrowser(this.platformId)) {
    return;
  }

  const tryLoad = () => {
    const companyId = this.getCompanyId();
    if (!companyId) {
      setTimeout(tryLoad, 300);
      return;
    }

    this.loadingClients.set(true);

    this.companyApi.getClients(companyId, 0, 50).pipe(
      catchError((error) => {
        console.error('CompanyAboutComponent: Error loading clients:', error);
        this.loadingClients.set(false);
        return of([]);
      })
    ).subscribe({
      next: (response: readonly ClientResponse[]) => {
        this.loadingClients.set(false);

      const mapped = response.map((client) => {
  let imageUrl = client.photourl ?? null;

  if (imageUrl) {
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      // use as-is
    } else if (imageUrl.startsWith('/')) {
      imageUrl = `/api/v1/files${imageUrl}`;
    } else if (imageUrl.startsWith('assets/')) {
      // use as-is
    } else {
      imageUrl = `/api/v1/files/${imageUrl}`;
    }
  }

  return {
    logo: imageUrl || '/assets/images/client-placeholder.jpg',
  };
})

        this._clientViewList = mapped;
        this.totalClientPages.set(Math.max(1, Math.ceil(mapped.length / 8)));
      },
      error: () => {
        this.loadingClients.set(false);
        this._clientViewList = [];
        this.totalClientPages.set(1);
      }
    });
  };

  tryLoad();
}









  onCampusPageChange(page: number): void {
    this.currentCampusPage.set(page);
  }

  onTeamPageChange(page: number): void {
    this.currentTeamPage.set(page);
  }

  onClientPageChange(page: number): void {
    this.currentClientPage.set(page);
  }

  onTestimonialPageChange(page: number): void {
    this.currentTestimonialPage.set(page);
  }

  submitFeedback(): void {
    // Handle feedback submission
    console.log('Feedback submitted:', this.feedbackForm);
  }

  onInviteCompany(): void {
    // Open invitation form modal
    this.modalService.openModal('company-invitation-form');
  }

  closeModal(): void {
    this.modalService.closeModal();
  }

  handleInvitationFormSubmit(value: InvitationFormValue): void {
    this.submittingInvitationForm = true;
    console.log('CompanyAboutComponent: Invitation form submitted:', value);
    
    // Build the API request from the form value
    const request: CompanyInvitationRequest = {
      campusId: 'CAMPUS_' + Date.now(), // Generate a simple campus ID
      campusName: value.campusName.trim(),
      contactPersonName: value.contactPersonName.trim(),
      contactPersonEmail: value.contactPersonEmail.trim(),
      contactPersonPhoneNo: value.contactPersonPhone.trim(),
      contactPersonDesignation: value.contactPersonDesignation.trim(),
      campusWebsiteUrl: value.campusWebsiteUrl.trim(),
      campusAddress: value.campusAddress.trim(),
      campusProspectusUrl: value.campusProspectus ? value.campusProspectus.name : undefined,
      academicYear: value.academicYear.trim(),
      programsOffered: value.programsOffered.trim().split(',').map(p => p.trim()), // Convert to array
      proposedDateForPlacementDrive: value.proposedDate.trim(),
      preferredSkills: value.preferredSkills.trim().split(',').map(s => s.trim()), // Convert to array
      facilitiesAvailableForRecruitmentProcess: value.facilitiesAvailable.trim(),
      inviteCompany: value.confirmationChecked,
    };

    console.log('CompanyAboutComponent: Making API call to submit company invitation', request);
    
    this.companyApi.submitCompanyInvitation(request).pipe(
      catchError((error) => {
        console.error('CompanyAboutComponent: Error submitting invitation:', error);
        this.submittingInvitationForm = false;
        
        // Handle different error types
        if (error?.status === 500) {
          const errorMessage = error?.error?.message || 'Server error occurred. Please try again.';
          this.notify.error(`Failed to submit invitation: ${errorMessage}`);
        } else if (error?.status === 502) {
          this.notify.error('Backend service not configured. Please contact administrator.');
        } else {
          const errorMessage = error?.error?.message || 'Failed to submit invitation. Please try again.';
          this.notify.error(errorMessage);
        }
        return of(null);
      })
    ).subscribe({
      next: (response: CompanyInvitationResponse | null) => {
        console.log('CompanyAboutComponent: Invitation submitted successfully', response);
        this.submittingInvitationForm = false;
        if (response) {
          this.notify.success('Your company invitation has been successfully submitted!');
          this.closeModal();
          // Reset form
          this.invitationFormValue = {
            campusName: '',
            contactPersonName: '',
            contactPersonEmail: '',
            contactPersonPhone: '',
            contactPersonDesignation: '',
            campusWebsiteUrl: '',
            campusAddress: '',
            campusProspectus: null,
            academicYear: '',
            programsOffered: '',
            proposedDate: '',
            preferredSkills: '',
            facilitiesAvailable: '',
            confirmationChecked: false,
          };
        } else {
          // Response is null - error was already handled in catchError
        }
      },
      error: (error: unknown) => {
        console.error('CompanyAboutComponent: Error in invitation submission subscription:', error);
        this.submittingInvitationForm = false;
        this.notify.error('An error occurred while submitting the invitation.');
      }
    });
  }

  onReadMore(): void {
    // Handle read more action
    console.log('Read More clicked');
  }

  // Expose Math to template
  readonly Math = Math;
}
