import { CommonModule,isPlatformBrowser } from '@angular/common';
import { Component, computed, inject, signal, OnInit,PLATFORM_ID } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { CarouselComponent } from '../../../../shared/components/carousel/carousel.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { TextareaComponent } from '../../../../shared/components/textarea/textarea.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ModalService } from '../../../../core/modal/modal.service';
import { CompanyInvitationFormComponent, InvitationFormValue } from '../invitation-form/company-invitation-form.component';
import { CompanyApiService, KeyPersonResponse, CompanyInvitationRequest,  TargetCampusResponse, ClientResponse,BenefitsOfferResponse } from '../../services/company-api.service';
import { AuthStateService } from '../../../../core/auth/auth-state.service';
import { StorageService } from '../../../../core/storage/storage.service';
import { STORAGE_KEYS } from '../../../../core/config/app.constants';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { catchError, of } from 'rxjs';
import { CompanyRegistrationResponse } from '../../services/company-api.service';


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
  description?: string;
}

interface Vacancy {
  jobTitle: string;
  jobLocation: string;
  department: string;
  jobType: string;
  salary: string;
  numberOfOpenings: string;
  contractDuration: string;
  jobDescription: string;
  requiredQualifications: string[];
  streamsEligible: string[];
  minimumCgpaPercentage: string;
  yearOfPassing: string;
  selectionProcess: string[];
  interviewMode: string;
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

  //campus section for comapany invite 
    selectedCampusId: string | null = null;
  campusOptions: { label: string; value: string }[] = [];

onCampusSelected(id: string): void {
  this.selectedCampusId = id;

  const selected = this.campusOptions.find(c => c.value === id);
  if (selected) {
    this.invitationFormValue = {
      ...this.invitationFormValue,
      campusName: selected.label, 
    };
  }
}


  // Key People - API Integration
  readonly keyPeople = signal<readonly KeyPersonResponse[]>([]);
  readonly loadingKeyPeople = signal(false);

  // Campus carousel - API Integration
  readonly targetCampuses = signal<readonly TargetCampusResponse[]>([]);
  readonly loadingTargetCampuses = signal(false);

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

currentCampusPage = signal(1);
currentTeamPage = signal(1);

  // Benefits
 // Benefits
internToJobRate = 0;
startingSalaryRange = '';
benefitsData: BenefitsOfferResponse | null = null;

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

// vision
// Vision & Performance
companyVision = '';
loadingVision = false;

// read more 
companyWebsiteUrl: string | null = null;
loadingCompanyDetails = signal(false);

//company about text 
companyAboutText = '';

// ----------- current vacancy ---
readonly loadingVacancies = signal(false);
readonly vacancies = signal<Vacancy[]>([]);
selectedVacancy = signal<Vacancy | null>(null);


// pagination state
currentVacancyPage = signal(1);
totalVacancyPages = signal(1);
private allVacancies: Vacancy[] = [];
private readonly vacancyPageSize = 3;



 // Optional: placeholder clients before API loads
readonly placeholderClients: { logo: string }[] = Array(8).fill(null).map((_, i) => ({
  logo: `/assets/images/client-${i + 1}-placeholder.jpg`,
}));

 // ===================== TESTIMONIALS =====================
readonly loadingTestimonials = signal(false);
readonly testimonials = signal<
  { quote: string; author: string; image: string }[]
>([]);
currentTestimonialPage = signal(1);
totalTestimonialPages = signal(1);

loadTestimonials(page = 1): void {
  const companyId = this.getCompanyId();
  if (!companyId) return;

  this.loadingTestimonials.set(true);

  this.companyApi.getTestimonials(companyId, page, 1).pipe(
    catchError((err) => {
      console.error('CompanyAboutComponent: Error loading testimonials', err);
      this.loadingTestimonials.set(false);
      return of(null);
    })
  ).subscribe((res) => {
    this.loadingTestimonials.set(false);

    if (!res) {
      this.testimonials.set([]);
      this.totalTestimonialPages.set(1);
      return;
    }

   const mapped = res.content.map((t: unknown) => {
  const item = t as {
    quote?: string;
    author?: string;
    photoUrl?: string;
  };

  let img = item.photoUrl || '';

  if (img) {
    if (img.startsWith('http')) {
      // use as-is
    } else if (img.startsWith('/')) {
      img = `/api/v1/files${img}`;
    } else {
      img = `/api/v1/files/${img}`;
    }
  }

  return {
    quote: item.quote || '',
    author: item.author || '',
    image: img || '/assets/images/testimonial-placeholder.jpg',
  };
});

    this.testimonials.set(mapped);
    this.totalTestimonialPages.set(Math.max(1, res.totalPages));
  });
}


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
  this.loadTestimonials(1);
  this.loadBenefitsOffer();
  this.loadCompanyVision();
  this.loadCurrentVacancies();
 this.loadCompanyDetails();
//  this.onReadMore();
}

// ---------------------- LOADING COMPANY DETAILS --------------


loadCompanyDetails(): void {
  const companyId = this.getCompanyId();
  if (!companyId) {
    console.warn('CompanyAboutComponent: No company ID available, cannot load company details');
    return;
  }

  this.loadingCompanyDetails.set(true);
  
  this.companyApi.getCompanyById(companyId).pipe(
    catchError((error) => {
      console.error('CompanyAboutComponent: Error loading company details:', error);
      this.loadingCompanyDetails.set(false);
      return of(null);
    })
  ).subscribe({
    next: (response: CompanyRegistrationResponse | null) => {
      this.loadingCompanyDetails.set(false);

      if (response?.websiteUrl) {
        this.companyWebsiteUrl = response.websiteUrl;
      }

      if (response?.aboutCompany) {
        this.companyAboutText = response.aboutCompany;
      } else {
        this.companyAboutText = '';
      }
    },
  error: (err) => {
  console.error('CompanyAboutComponent: Error in company details subscription:', err);
  this.loadingCompanyDetails.set(false);
}

  });
}

onReadMore(): void {
  if (!this.companyWebsiteUrl) {
    this.notify.error('Website URL is not available for this company');
    return;
  }

  let url = this.companyWebsiteUrl.trim();

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  try {
    new URL(url);
    window.open(url, '_blank', 'noopener,noreferrer');
  } 
  catch  {
    this.notify.error('Invalid website URL format');
  }
}


// --------------------------- LOAD ALL CAMPUS -----------------


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

  // -------------- KEY PEOPLE ----------------------

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
  // ------------ OUR TARGET CAMPUS -----------------

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

  // --------------------- CURRENT VACNACY -----------

loadCurrentVacancies(): void {
  const companyId = this.getCompanyId();
  if (!companyId) return;

  this.loadingVacancies.set(true);

  this.companyApi.getVacancies(companyId, 0, 100).pipe(
    catchError(err => {
      console.error('Error loading vacancies', err);
      this.loadingVacancies.set(false);
      return of([]);
    })
  ).subscribe((res) => {
    this.loadingVacancies.set(false);

    const mapped: Vacancy[] = (res as unknown[]).map((v) => {
      const item = v as Partial<Vacancy>;

      return {
        jobTitle: item.jobTitle ?? '',
        jobLocation: item.jobLocation ?? '',
        department: item.department ?? '',
        jobType: item.jobType ?? '',
        salary: item.salary ?? '',
        numberOfOpenings: item.numberOfOpenings ?? '0',
        contractDuration: item.contractDuration ?? '',
        jobDescription: item.jobDescription ?? '',
        requiredQualifications: item.requiredQualifications ?? [],
        streamsEligible: item.streamsEligible ?? [],
        minimumCgpaPercentage: item.minimumCgpaPercentage ?? '',
        yearOfPassing: item.yearOfPassing ?? '',
        selectionProcess: item.selectionProcess ?? [],
        interviewMode: item.interviewMode ?? '',
      };
    });

    this.allVacancies = mapped;
    const pages = Math.max(1, Math.ceil(this.allVacancies.length / this.vacancyPageSize));
    this.totalVacancyPages.set(pages);

    this.currentVacancyPage.set(1);
    this.updateVacancyPage();
  });
}

private updateVacancyPage(): void {
  const start = (this.currentVacancyPage() - 1) * this.vacancyPageSize;
  const end = start + this.vacancyPageSize;
  this.vacancies.set(this.allVacancies.slice(start, end));
}

onVacancyPageChange(page: number): void {
  this.currentVacancyPage.set(page);
  this.updateVacancyPage();
}



openVacancyDetails(job: Vacancy): void {
  this.selectedVacancy.set(job);
  this.modalService.openModal('company-current-vacancy');
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

 const mapped = response.map((client: ClientResponse) => {
  let imageUrl = client.photourl || client.clientLogo || client.logoUrl || null;

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
});


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

// --------------------- AUTOSEARCH CAMPUS ------------------

onCampusSearch(term: string): void {
  if (!term || term.trim().length < 2) {
    this.campusOptions = [];
    return;
  }

  this.companyApi.searchCampuses(term).subscribe((res) => {
    const list = res.data?.content ?? [];

    this.campusOptions = list.map(c => ({
      label: c.campusName,
      value: c.id,
    }));
  });
}

// -----------------  BENEFITS OFFER ---------

loadBenefitsOffer(): void {
  const companyId = this.getCompanyId();
  if (!companyId) return;

  this.companyApi.getBenefitsOffer(companyId).subscribe({
    next: (res) => {
      if (!res) return;

      this.benefitsData = res;

      const rate = res.internToJobRate?.replace('%', '') ?? '0';
      this.internToJobRate = Number(rate) || 0;
      this.startingSalaryRange = res.startingSalaryRange || '';

      const map: Record<string, string | undefined> = {
        'Performance Bonus': res.performanceBonus,
        'Healthcare': res.healthcare,
        'Mentor Buddy System': res.mentorBuddySystem,
        'Work Life Balance Perks': res.workLifeBalancePerks,
        'Appreciation Day Off': res.appreciationDayOff,
        'Training & Upskilling': res.trainingAndUpskilling,
        'Sick Leaves': res.sickLeaves,
        'New Employee Referral Bonus': res.referralBonus,
      };

      this.benefits = this.benefits.map(b => ({
        ...b,
        description: map[b.title] || '',
      }));
    },
    error: (err) => {
      console.error('Error loading benefits offer', err);
    }
  });
}

// ------------------ OUR VISION & PERFORMANCE -------------------------------------

loadCompanyVision(): void {
  const tryLoad = () => {
    const companyId = this.getCompanyId();
    if (!companyId) {
      setTimeout(tryLoad, 300);
      return;
    }

    this.loadingVision = true;

    this.companyApi.getCompanyVision(companyId).pipe(
      catchError((err) => {
        console.error('Error loading company vision', err);
        this.loadingVision = false;
        return of(null);
      })
    ).subscribe((res) => {
      this.loadingVision = false;

      if (res?.vision) {
        this.companyVision = res.vision;
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
  this.loadTestimonials(page);
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
  if (!this.selectedCampusId) {
    this.notify.error('Please select a campus');
    return;
  }

  this.submittingInvitationForm = true;

  const request: CompanyInvitationRequest = {
    campusId: this.selectedCampusId,   // 🔥 real backend ID
    campusName: value.campusName.trim(),

    contactPersonName: value.contactPersonName.trim(),
    contactPersonEmail: value.contactPersonEmail.trim(),
    contactPersonPhoneNo: value.contactPersonPhone.trim(),
    contactPersonDesignation: value.contactPersonDesignation.trim(),

    campusWebsiteUrl: value.campusWebsiteUrl.trim(),
    campusAddress: value.campusAddress.trim(),

    campusProspectusUrl: value.campusProspectus
      ? `https://dummy.com/${value.campusProspectus.name}` // backend expects URL
      : undefined,

    academicYear: value.academicYear.trim(),

    programsOffered: Array.isArray(value.programsOffered)
      ? value.programsOffered
      : [value.programsOffered],

    preferredSkills: Array.isArray(value.preferredSkills)
      ? value.preferredSkills
      : [value.preferredSkills],

    proposedDateForPlacementDrive: value.proposedDate.trim(),
    facilitiesAvailableForRecruitmentProcess: value.facilitiesAvailable.trim(),

    inviteCompany: value.confirmationChecked,
  };


  const companyId = this.getCompanyId();

if (!companyId) {
  this.notify.error('Company ID not found. Please login again.');
  this.submittingInvitationForm = false;
  return;
}

this.companyApi.submitCompanyInvitation(companyId, request).subscribe({
  next: (res) => {
    console.log('Invitation submitted', res);
    this.submittingInvitationForm = false;
    this.modalService.closeModal();
    this.notify.success('Invitation sent successfully');
  },
  error: (err) => {
    console.error('Error submitting invitation', err);
    this.submittingInvitationForm = false;
    this.notify.error('Failed to send invitation');
  }
});

}



 

  // Expose Math to template
  readonly Math = Math;
}
