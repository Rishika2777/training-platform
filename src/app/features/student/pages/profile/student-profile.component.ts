import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { TextareaComponent } from '../../../../shared/components/textarea/textarea.component';
import { StudentApiService } from '../../services/student-api.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { ApiResponseObject, ApiResponseBatchmateResponse, ApiResponsePageAlumniResponse } from '../../models/student.models';
import { catchError, of } from 'rxjs';

interface PersonCard {
  name: string;
  imageUrl: string;
  designation?: string;
  company?: string;
}

@Component({
  selector: 'app-student-profile',
  standalone: true,
  imports: [CommonModule, CardComponent, ButtonComponent, InputComponent, TextareaComponent],
  templateUrl: './student-profile.component.html',
  styleUrl: './student-profile.component.css',
})
export class StudentProfileComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly studentApi = inject(StudentApiService);
  private readonly auth = inject(AuthService);

  // Route parameters
  readonly studentId = signal<string | null>(null);
  readonly userId = signal<string | null>(null);
  readonly isStandalone = signal<boolean>(false);

  // Profile data
  readonly profileData = signal<Record<string, unknown> | null>(null);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // Additional data
  readonly batchmates = signal<readonly PersonCard[]>([]);
  readonly alumni = signal<readonly PersonCard[]>([]);
  readonly loadingBatchmates = signal<boolean>(false);
  readonly loadingAlumni = signal<boolean>(false);

  // Feedback form
  feedbackName = '';
  feedbackComment = '';
  feedbackRecommendation: 'yes' | 'no' | null = null;

  // Pagination and carousel
  currentBatchmatesPage = 1;
  currentAlumniIndex = 0;
  currentTestimonialIndex = 0;

  ngOnInit(): void {
    // Check if opened in standalone mode (new tab)
    this.route.queryParamMap.subscribe((queryParams) => {
      const standalone = queryParams.get('standalone');
      this.isStandalone.set(standalone === 'true');
      console.log('📋 Profile Page - Standalone mode:', this.isStandalone());
    });

    // Extract route parameters
    this.route.paramMap.subscribe((params) => {
      const studentIdFromRoute = params.get('studentId');
      const userIdFromRoute = params.get('userId');

      console.log('📋 Profile Page - Route Params:', {
        studentId: studentIdFromRoute,
        userId: userIdFromRoute,
      });

      // If route params exist, use them (opened from "Get to Know Me")
      if (studentIdFromRoute && userIdFromRoute) {
        this.studentId.set(studentIdFromRoute);
        this.userId.set(userIdFromRoute);
        this.loadStudentProfile(studentIdFromRoute);
      } else {
        // Get studentId from current user and load profile
        this.loadProfileFromCurrentUser();
      }
    });
  }

  /**
   * Load profile using studentId from current user
   */
  private loadProfileFromCurrentUser(): void {
    const currentUser = this.auth.getCurrentUser();
    console.log('📋 Profile Page - Current user:', currentUser);
    
    if (!currentUser) {
      console.error('❌ No current user found');
      this.error.set('User not authenticated. Please login again.');
      return;
    }

    // Get studentId from current user
    const studentId = currentUser.studentId;
    const userId = currentUser.userId?.toString() || null;

    console.log('📋 Profile Page - Extracted IDs:', { studentId, userId });

    if (!studentId) {
      console.error('❌ No studentId found in current user data');
      this.error.set('Student ID not found. Please ensure your profile is complete.');
      return;
    }

    this.studentId.set(studentId);
    this.userId.set(userId);
    this.loadStudentProfile(studentId);
  }

  /**
   * Load student profile using the studentId from route
   * Uses full profile API which gets all the student data
   */
  private loadStudentProfile(studentId: string): void {
    console.log('📡 Loading student full profile for studentId:', studentId);
    this.loading.set(true);
    this.error.set(null);

    // Get current user for requester info
    const currentUser = this.auth.getCurrentUser();
    const requesterUserId = this.userId() || currentUser?.userId?.toString() || '';
    const requesterUserType = 'STUDENT';

    console.log('📡 Requester info:', { requesterUserId, requesterUserType });

    // Call the full profile API
    // requesterUserId and requesterUserType are required
    this.studentApi.getStudentFullProfile(studentId, requesterUserId, requesterUserType).subscribe({
      next: (response: ApiResponseObject) => {
        console.log('✅ Student full profile loaded:', response);
        this.loading.set(false);
        
        if (response.success && response.data) {
          const profileData = response.data as Record<string, unknown>;
          this.profileData.set(profileData);
          // Store profile data in localStorage for use on home page (to avoid calling profile API there)
          try {
            localStorage.setItem('student_profile_data', JSON.stringify(profileData));
          } catch (error) {
            console.warn('Failed to store profile data in localStorage:', error);
          }
          // Load batchmates and alumni after profile is loaded
          this.loadBatchmates(studentId);
          this.loadAlumni(studentId);
        } else {
          this.error.set(response.message || 'Failed to load profile data');
        }
      },
      error: (err: { message?: string; error?: { message?: string } }) => {
        console.error('❌ Failed to load student full profile:', err);
        this.loading.set(false);
        const errorMessage = err.error?.message || err.message || 'Failed to load profile';
        this.error.set(errorMessage);
      },
    });
  }

  /**
   * Reload profile data
   */
  reload(): void {
    const studentId = this.studentId();
    if (studentId) {
      this.loadStudentProfile(studentId);
    }
  }

  /**
   * Load batchmates for the student
   */
  private loadBatchmates(studentId: string): void {
    const campusName = this.getInstitutionName();
    const yearOfPassing = this.getYearOfPassing();
    
    if (!campusName || !yearOfPassing) {
      console.warn('Cannot load batchmates: campusName or yearOfPassing is missing', { campusName, yearOfPassing });
      return;
    }

    this.loadingBatchmates.set(true);
    this.studentApi.getBatchmates(studentId, campusName, yearOfPassing, 1, 12)
      .pipe(catchError((error) => {
        console.error('Error loading batchmates:', error);
        this.loadingBatchmates.set(false);
        return of(null);
      }))
      .subscribe({
        next: (response: ApiResponseBatchmateResponse | null) => {
          this.loadingBatchmates.set(false);
          if (response?.success && response.data) {
            const items = response.data.map((item) => this.mapBatchmateToPersonCard(item as unknown));
            this.batchmates.set(items);
          }
        },
      });
  }

  /**
   * Load alumni for the student
   */
  private loadAlumni(studentId: string): void {
    const campusName = this.getInstitutionName();
    const yearOfPassing = this.getYearOfPassing();
    
    if (!campusName || !yearOfPassing) {
      console.warn('Cannot load alumni: campusName or yearOfPassing is missing', { campusName, yearOfPassing });
      return;
    }

    this.loadingAlumni.set(true);
    this.studentApi.getAlumniForStudent(studentId, campusName, yearOfPassing, 1, 10)
      .pipe(catchError((error) => {
        console.error('Error loading alumni:', error);
        this.loadingAlumni.set(false);
        return of(null);
      }))
      .subscribe({
        next: (response: ApiResponsePageAlumniResponse | null) => {
          this.loadingAlumni.set(false);
          if (response?.success && response.data) {
            const items = (response.data.content || []).map((item) => this.mapAlumniToPersonCard(item as unknown));
            this.alumni.set(items);
          }
        },
      });
  }

  /**
   * Map batchmate data to PersonCard
   */
  private mapBatchmateToPersonCard(item: unknown): PersonCard {
    const batchmate = item as { firstName?: string; lastName?: string; profilePhotoUrl?: string };
    const firstName = (batchmate.firstName || '').trim();
    const lastName = (batchmate.lastName || '').trim();
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Unknown';
    const photoUrl = batchmate.profilePhotoUrl || '';
    const imageUrl = photoUrl
      ? (photoUrl.startsWith('http') ? photoUrl : `/api/v1/files/${photoUrl}`)
      : 'assets/images/login-news-image.png';
    
    return { name: fullName, imageUrl };
  }

  /**
   * Map alumni data to PersonCard
   */
  private mapAlumniToPersonCard(item: unknown): PersonCard {
    const alumnus = item as { 
      firstName?: string; 
      lastName?: string; 
      profilePhotoUrl?: string;
      designation?: string;
      companyName?: string;
    };
    const firstName = (alumnus.firstName || '').trim();
    const lastName = (alumnus.lastName || '').trim();
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Unknown';
    const photoUrl = alumnus.profilePhotoUrl || '';
    const imageUrl = photoUrl
      ? (photoUrl.startsWith('http') ? photoUrl : `/api/v1/files/${photoUrl}`)
      : 'assets/images/login-news-image.png';
    
    return {
      name: fullName,
      imageUrl,
      designation: alumnus.designation,
      company: alumnus.companyName,
    };
  }

  /**
   * Helper methods to extract data from profileData
   */
  getProfileValue(key: string): unknown {
    return this.profileData()?.[key];
  }

  getStringValue(key: string, defaultValue = ''): string {
    const value = this.getProfileValue(key);
    return value ? String(value) : defaultValue;
  }

  getArrayValue(key: string): unknown[] {
    const value = this.getProfileValue(key);
    return Array.isArray(value) ? value : [];
  }

  getFirstName(): string {
    return this.getStringValue('firstName');
  }

  getLastName(): string {
    return this.getStringValue('lastName');
  }

  getFullName(): string {
    const first = this.getFirstName();
    const last = this.getLastName();
    return [first, last].filter(Boolean).join(' ') || 'Unknown';
  }

  getProfilePhotoUrl(): string {
    const photoUrl = this.getStringValue('profilePhotoUrl');
    if (!photoUrl) return 'assets/images/login-news-image.png';
    return photoUrl.startsWith('http') ? photoUrl : `/api/v1/files/${photoUrl}`;
  }

  getResumeUrl(): string {
    const resumeUrl = this.getStringValue('resumeUrl');
    if (!resumeUrl) return '#';
    return resumeUrl.startsWith('http') ? resumeUrl : `/api/v1/files/${resumeUrl}`;
  }

  getInstitutionName(): string {
    const institutions = this.getArrayValue('institutionName');
    return institutions.length > 0 ? String(institutions[0]) : '';
  }

  getCompanyName(): string {
    return this.getStringValue('companyName');
  }

  getRole(): string {
    return this.getStringValue('role');
  }

  getStartDate(): string {
    return this.getStringValue('startDate');
  }

  getEndDate(): string {
    return this.getStringValue('endDate');
  }

  getCurrentlyWorking(): boolean {
    return Boolean(this.getProfileValue('currentlyWorking'));
  }

  getEmploymentType(): string[] {
    return this.getArrayValue('employmentType') as string[];
  }

  getExpectedSalary(): string {
    return this.getStringValue('expectedSalary');
  }

  getPreferredLocation(): string[] {
    return this.getArrayValue('preferredLocation') as string[];
  }

  getAvailability(): string[] {
    return this.getArrayValue('availability') as string[];
  }

  getJobRolesOfInterest(): string[] {
    return this.getArrayValue('jobRolesOfInterest') as string[];
  }

  getLanguagesKnown(): string[] {
    return this.getArrayValue('languagesKnown') as string[];
  }

  getSoftSkills(): string[] {
    return this.getArrayValue('softSkills') as string[];
  }

  getProficiencyLevel(): string {
    return this.getStringValue('proficiencyLevel');
  }

  getCgpa(): string {
    return this.getStringValue('cgpa');
  }

  getYearOfPassing(): string {
    return this.getStringValue('yearOfPassing');
  }

  getCertificates(): string[] {
    return this.getArrayValue('certificates') as string[];
  }

  getPortfolioUrl(): string {
    return this.getStringValue('portfolioUrl');
  }

  getOtherWebsites(): string[] {
    return this.getArrayValue('otherWebsites') as string[];
  }

  getOffersInHand(): boolean {
    return Boolean(this.getProfileValue('offersInHand'));
  }

  getJobAlertPreference(): string {
    return this.getStringValue('jobAlertPreference');
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
  }

  getProjects(): { projectId?: string; projectName?: string; description?: string; technologiesUsed?: string[] }[] {
    const projects = this.getArrayValue('projects');
    console.log('📦 Projects data:', projects);
    console.log('📦 Projects length:', projects.length);
    if (projects.length > 0) {
      console.log('📦 First project:', projects[0]);
    }
    return projects as { projectId?: string; projectName?: string; description?: string; technologiesUsed?: string[] }[];
  }

  /**
   * Format project description to handle newlines
   */
  formatProjectDescription(description: string | undefined): string {
    if (!description) return 'No description available.';
    return description.replace(/\n/g, '<br>');
  }

  getTechnicalSkills(): string[] {
    return this.getArrayValue('technicalSkills') as string[];
  }

  getQualifications(): string[] {
    return this.getArrayValue('qualifications') as string[];
  }

  getDegrees(): string[] {
    return this.getArrayValue('degrees') as string[];
  }

  getSpecializations(): string[] {
    return this.getArrayValue('specializations') as string[];
  }

  /**
   * Handle feedback form submission
   */
  submitFeedback(): void {
    if (!this.feedbackName.trim() || !this.feedbackComment.trim() || !this.feedbackRecommendation) {
      return;
    }
    // TODO: Implement feedback submission API call
    console.log('Feedback submitted:', {
      name: this.feedbackName,
      comment: this.feedbackComment,
      recommendation: this.feedbackRecommendation,
    });
    // Reset form
    this.feedbackName = '';
    this.feedbackComment = '';
    this.feedbackRecommendation = null;
  }

  /**
   * Download resume
   */
  downloadResume(): void {
    const resumeUrl = this.getResumeUrl();
    if (resumeUrl && resumeUrl !== '#') {
      window.open(resumeUrl, '_blank');
    }
  }

  /**
   * Get technology icon class
   */
  getTechIcon(tech: string): string {
    const techLower = tech.toLowerCase();
    if (techLower.includes('html')) return 'html5';
    if (techLower.includes('css')) return 'css3-alt';
    if (techLower.includes('javascript') || techLower.includes('js')) return 'js';
    if (techLower.includes('react')) return 'react';
    if (techLower.includes('node')) return 'node-js';
    if (techLower.includes('mongodb')) return 'mongodb';
    if (techLower.includes('angular')) return 'angular';
    if (techLower.includes('python')) return 'python';
    if (techLower.includes('java')) return 'java';
    return 'code';
  }

  /**
   * Get bar color for chart
   */
  getBarColor(index: number): string {
    const colors = ['#9C27B0', '#FF9800', '#03A9F4', '#00BCD4', '#9C27B0', '#E91E63', '#4CAF50'];
    return colors[index % colors.length];
  }

  /**
   * Get initials from name for fallback when image is not available
   */
  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
    return (first + last).toUpperCase() || '?';
  }

  /**
   * Check if image URL is valid
   */
  hasValidImage(imageUrl: string | null | undefined): boolean {
    return !!(imageUrl && imageUrl !== 'assets/images/login-news-image.png' && !imageUrl.includes('placeholder'));
  }

  /**
   * Get batchmate specialization or default
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getBatchmateSpecialization(_batchmate: PersonCard): string {
    const specializations = this.getSpecializations();
    return specializations.length > 0 ? specializations[0] : 'CS';
  }

  /**
   * Get total courses count for donut chart
   */
  getTotalCourses(): number {
    const qualifications = this.getQualifications().length;
    const degrees = this.getDegrees().length;
    const specializations = this.getSpecializations().length;
    return qualifications + degrees + specializations || 20;
  }

  /**
   * Get skill bar height percentage (mock data for now)
   */
  getSkillBarHeight(skill: string, index: number): number {
    // Mock heights based on skill index - in real app, this would come from API
    const heights: Record<string, number> = {
      'Python': 28,
      'HTML/CSS': 92,
      'Java': 81,
      'React.js': 62,
      'Node.js': 41,
      'UX': 83,
      'DBMS': 80,
    };
    
    // Try to match by name
    const skillLower = skill.toLowerCase();
    for (const [key, value] of Object.entries(heights)) {
      if (skillLower.includes(key.toLowerCase())) {
        return value;
      }
    }
    
    // Default: use index-based height
    return 30 + (index * 10);
  }

  /**
   * Pagination methods for batchmates
   */
  previousBatchmatesPage(): void {
    if (this.currentBatchmatesPage > 1) {
      this.currentBatchmatesPage--;
      // TODO: Load batchmates for this page
    }
  }

  nextBatchmatesPage(): void {
    if (this.currentBatchmatesPage < 6) {
      this.currentBatchmatesPage++;
      // TODO: Load batchmates for this page
    }
  }

  goToBatchmatesPage(page: number): void {
    this.currentBatchmatesPage = page;
    // TODO: Load batchmates for this page
  }

  /**
   * Carousel navigation for alumni
   */
  previousAlumni(): void {
    // TODO: Implement carousel logic
    console.log('Previous alumni');
  }

  nextAlumni(): void {
    // TODO: Implement carousel logic
    console.log('Next alumni');
  }

  /**
   * Carousel navigation for testimonials
   */
  previousTestimonial(): void {
    // TODO: Implement carousel logic
    console.log('Previous testimonial');
  }

  nextTestimonial(): void {
    // TODO: Implement carousel logic
    console.log('Next testimonial');
  }

  /**
   * Handle image error - hide image and show initials
   */
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.style.display = 'none';
      const nextSibling = img.nextElementSibling as HTMLElement;
      if (nextSibling) {
        nextSibling.style.display = 'flex';
      }
    }
  }
}


