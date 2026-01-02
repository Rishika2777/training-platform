import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { CarouselComponent } from '../../../../shared/components/carousel/carousel.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { TextareaComponent } from '../../../../shared/components/textarea/textarea.component';

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
  ],
  templateUrl: './company-about.component.html',
  styleUrl: './company-about.component.css',
})
export class CompanyAboutComponent {
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

  onJoinCommunity(): void {
    // Handle join community action
    console.log('Join Community clicked');
  }

  onReadMore(): void {
    // Handle read more action
    console.log('Read More clicked');
  }

  // Expose Math to template
  readonly Math = Math;
}
