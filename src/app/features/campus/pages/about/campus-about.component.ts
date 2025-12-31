import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { CarouselComponent } from '../../../../shared/components/carousel/carousel.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { TextareaComponent } from '../../../../shared/components/textarea/textarea.component';

interface PersonCard {
  id: string;
  name: string;
  imageUrl: string;
  batch?: string;
  company?: string;
  designation?: string;
}

interface CourseCard {
  id: string;
  name: string;
  seats: number;
  duration: string;
}

@Component({
  selector: 'app-campus-about',
  standalone: true,
  imports: [
    CommonModule,
    ButtonComponent,
    CarouselComponent,
    InputComponent,
    TextareaComponent,
  ],
  templateUrl: './campus-about.component.html',
  styleUrl: './campus-about.component.css',
})
export class CampusAboutComponent {
  readonly pageSize = 8;

  // Rising Stars
  readonly risingStars: readonly PersonCard[] = [
    { id: '1', name: 'Name', imageUrl: 'assets/images/login-news-image.png' },
    { id: '2', name: 'Name', imageUrl: 'assets/images/landing-card-campus.png' },
    { id: '3', name: 'Name', imageUrl: 'assets/images/landing-card-company.png' },
    { id: '4', name: 'Name', imageUrl: 'assets/images/landing-card-institution.png' },
    { id: '5', name: 'Name', imageUrl: 'assets/images/login-hero-image.png' },
    { id: '6', name: 'Name', imageUrl: 'assets/images/login-news-image.png' },
    { id: '7', name: 'Name', imageUrl: 'assets/images/landing-card-campus.png' },
    { id: '8', name: 'Name', imageUrl: 'assets/images/landing-card-company.png' },
  ];

  risingStarsPage = 1;
  get risingStarsTotalPages(): number {
    return Math.max(1, Math.ceil(this.risingStars.length / this.pageSize));
  }
  risingStarsPageItems(): readonly PersonCard[] {
    return this.slicePage(this.risingStars, this.risingStarsPage, this.pageSize);
  }

  // Success Stories
  readonly successStories: readonly PersonCard[] = [
    { id: '1', name: 'Name', batch: 'Batch', company: 'Company', imageUrl: 'assets/images/login-news-image.png' },
    { id: '2', name: 'Name', batch: 'Batch', company: 'Company', imageUrl: 'assets/images/landing-card-campus.png' },
    { id: '3', name: 'Name', batch: 'Batch', company: 'Company', imageUrl: 'assets/images/landing-card-company.png' },
    { id: '4', name: 'Name', batch: 'Batch', company: 'Company', imageUrl: 'assets/images/landing-card-institution.png' },
    { id: '5', name: 'Name', batch: 'Batch', company: 'Company', imageUrl: 'assets/images/login-hero-image.png' },
    { id: '6', name: 'Name', batch: 'Batch', company: 'Company', imageUrl: 'assets/images/login-news-image.png' },
    { id: '7', name: 'Name', batch: 'Batch', company: 'Company', imageUrl: 'assets/images/landing-card-campus.png' },
    { id: '8', name: 'Name', batch: 'Batch', company: 'Company', imageUrl: 'assets/images/landing-card-company.png' },
    { id: '9', name: 'Name', batch: 'Batch', company: 'Company', imageUrl: 'assets/images/landing-card-institution.png' },
    { id: '10', name: 'Name', batch: 'Batch', company: 'Company', imageUrl: 'assets/images/login-hero-image.png' },
  ];

  successStoryPage = 1;
  readonly successStoryPageSize = 6;
  get successStoriesTotalPages(): number {
    return Math.max(1, Math.ceil(this.successStories.length / this.successStoryPageSize));
  }
  successStoriesPageItems(): readonly PersonCard[] {
    return this.slicePage(this.successStories, this.successStoryPage, this.successStoryPageSize);
  }

  previousSuccessStory(): void {
    if (this.successStoryPage > 1) {
      this.successStoryPage--;
    }
  }

  nextSuccessStory(): void {
    if (this.successStoryPage < this.successStoriesTotalPages) {
      this.successStoryPage++;
    }
  }

  // Courses
  readonly courses: readonly CourseCard[] = [
    { id: '1', name: 'BCA', seats: 30, duration: '3 yr' },
    { id: '2', name: 'BCA', seats: 30, duration: '3 yr' },
    { id: '3', name: 'BCA', seats: 30, duration: '3 yr' },
    { id: '4', name: 'BCA', seats: 30, duration: '3 yr' },
  ];

  coursePage = 1;
  readonly coursePageSize = 4;
  get coursesTotalPages(): number {
    return Math.max(1, Math.ceil(this.courses.length / this.coursePageSize));
  }
  coursesPageItems(): readonly CourseCard[] {
    return this.slicePage(this.courses, this.coursePage, this.coursePageSize);
  }

  previousCourse(): void {
    if (this.coursePage > 1) {
      this.coursePage--;
    }
  }

  nextCourse(): void {
    if (this.coursePage < this.coursesTotalPages) {
      this.coursePage++;
    }
  }

  // Placement Years
  readonly placementYears = ['2024', '2023', '2022', '2021', '2020'];

  getPlacementValue(year: string): number {
    const values: Record<string, number> = {
      '2024': 85,
      '2023': 80,
      '2022': 75,
      '2021': 70,
      '2020': 65,
    };
    return values[year] || 50;
  }

  getPlacementColor(year: string): string {
    const colors: Record<string, string> = {
      '2024': 'var(--color-primary)',
      '2023': 'var(--color-secondary)',
      '2022': '#87CEEB',
      '2021': 'var(--color-primary)',
      '2020': 'var(--color-secondary)',
    };
    return colors[year] || 'var(--color-secondary)';
  }

  // Faculties
  readonly faculties: readonly PersonCard[] = [
    { id: '1', name: 'Name', designation: 'Designation', imageUrl: 'assets/images/login-news-image.png' },
    { id: '2', name: 'Name', designation: 'Designation', imageUrl: 'assets/images/landing-card-campus.png' },
    { id: '3', name: 'Name', designation: 'Designation', imageUrl: 'assets/images/landing-card-company.png' },
    { id: '4', name: 'Name', designation: 'Designation', imageUrl: 'assets/images/landing-card-institution.png' },
    { id: '5', name: 'Name', designation: 'Designation', imageUrl: 'assets/images/login-hero-image.png' },
    { id: '6', name: 'Name', designation: 'Designation', imageUrl: 'assets/images/login-news-image.png' },
  ];

  facultiesPage = 1;
  readonly facultiesPageSize = 6;
  get facultiesTotalPages(): number {
    return Math.max(1, Math.ceil(this.faculties.length / this.facultiesPageSize));
  }
  facultiesPageItems(): readonly PersonCard[] {
    return this.slicePage(this.faculties, this.facultiesPage, this.facultiesPageSize);
  }

  // Alumni
  readonly alumni: readonly PersonCard[] = [
    { id: '1', name: 'Name', designation: 'Designation', company: 'Company', imageUrl: 'assets/images/login-news-image.png' },
    { id: '2', name: 'Name', designation: 'Designation', company: 'Company', imageUrl: 'assets/images/landing-card-campus.png' },
    { id: '3', name: 'Name', designation: 'Designation', company: 'Company', imageUrl: 'assets/images/landing-card-company.png' },
    { id: '4', name: 'Name', designation: 'Designation', company: 'Company', imageUrl: 'assets/images/landing-card-institution.png' },
    { id: '5', name: 'Name', designation: 'Designation', company: 'Company', imageUrl: 'assets/images/login-hero-image.png' },
    { id: '6', name: 'Name', designation: 'Designation', company: 'Company', imageUrl: 'assets/images/login-news-image.png' },
    { id: '7', name: 'Name', designation: 'Designation', company: 'Company', imageUrl: 'assets/images/landing-card-campus.png' },
  ];

  alumniPage = 1;
  readonly alumniPageSize = 7;
  get alumniTotalPages(): number {
    return Math.max(1, Math.ceil(this.alumni.length / this.alumniPageSize));
  }
  alumniPageItems(): readonly PersonCard[] {
    return this.slicePage(this.alumni, this.alumniPage, this.alumniPageSize);
  }

  previousAlumni(): void {
    if (this.alumniPage > 1) {
      this.alumniPage--;
    }
  }

  nextAlumni(): void {
    if (this.alumniPage < this.alumniTotalPages) {
      this.alumniPage++;
    }
  }

  // Testimonials
  testimonialPage = 1;
  readonly testimonialTotalPages = 3;

  previousTestimonial(): void {
    if (this.testimonialPage > 1) {
      this.testimonialPage--;
    }
  }

  nextTestimonial(): void {
    if (this.testimonialPage < this.testimonialTotalPages) {
      this.testimonialPage++;
    }
  }

  private slicePage<T>(items: readonly T[], page: number, pageSize: number): readonly T[] {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }
}