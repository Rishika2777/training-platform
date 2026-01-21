import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { CarouselComponent } from '../../../../shared/components/carousel/carousel.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { TextareaComponent } from '../../../../shared/components/textarea/textarea.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ModalService } from '../../../../core/modal/modal.service';
import { CompanyInvitationFormComponent, InvitationFormValue } from '../invitation-form/company-invitation-form.component';

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
export class CompanyAboutComponent {
  readonly modalService = inject(ModalService);
  // Engagement metrics
  promotions = 25;
  followers = 100;

  // Campus carousel
  currentCampusPage = signal(1);
  campuses: Campus[] = [
    { name: 'Campus Name', image: '/assets/images/campus-placeholder.jpg' },
    { name: 'Campus Name', image: '/assets/images/campus-placeholder.jpg' },
    { name: 'Campus Name', image: '/assets/images/campus-placeholder.jpg' },
    { name: 'Campus Name', image: '/assets/images/campus-placeholder.jpg' },
    { name: 'Campus Name', image: '/assets/images/campus-placeholder.jpg' },
  ];

  // Team members
  ceo = {
    name: 'Ankitha Willson',
    designation: 'CEO',
    image: '/assets/images/ceo-placeholder.jpg',
  };

  teamMembers: TeamMember[] = [
    { name: 'Name', designation: 'Designation', image: '/assets/images/team-placeholder.jpg' },
    { name: 'Name', designation: 'Designation', image: '/assets/images/team-placeholder.jpg' },
    { name: 'Name', designation: 'Designation', image: '/assets/images/team-placeholder.jpg' },
    { name: 'Name', designation: 'Designation', image: '/assets/images/team-placeholder.jpg' },
    { name: 'Name', designation: 'Designation', image: '/assets/images/team-placeholder.jpg' },
    { name: 'Name', designation: 'Designation', image: '/assets/images/team-placeholder.jpg' },
    { name: 'Name', designation: 'Designation', image: '/assets/images/team-placeholder.jpg' },
  ];

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

  // Clients carousel
  currentClientPage = signal(1);
  clients = Array(8).fill(null).map((_, i) => ({
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
    console.log('Invitation form submitted:', value);
    
    // TODO: Integrate with API when backend is ready
    // For now, just log and close modal after a delay
    setTimeout(() => {
      this.submittingInvitationForm = false;
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
    }, 1000);
  }

  onReadMore(): void {
    // Handle read more action
    console.log('Read More clicked');
  }

  // Expose Math to template
  readonly Math = Math;
}
