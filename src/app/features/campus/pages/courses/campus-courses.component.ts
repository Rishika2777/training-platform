import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, OnInit, OnDestroy, signal, PLATFORM_ID } from '@angular/core';
import { ModalService } from '../../../../core/modal/modal.service';
import { CampusApiService } from '../../services/campus-api.service';
import { NotificationService } from '../../../../core/notifications/notification.service';

export interface CourseCard {
  id: string;
  name: string;
  fullName: string;
  seats: number;
  duration: string;
}

@Component({
  selector: 'app-campus-courses',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './campus-courses.component.html',
  styleUrl: './campus-courses.component.css',
})
export class CampusCoursesComponent implements OnInit, OnDestroy {
  private readonly modalService = inject(ModalService);
  private readonly campusApi = inject(CampusApiService);
  private readonly notify = inject(NotificationService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId as object);

  readonly courses = signal<readonly CourseCard[]>([]);
  readonly loadingCourses = signal(false);
  readonly deletingCourseId = signal<string | null>(null);
  
  // Store event handler reference for cleanup
  private courseAddedHandler: (() => void) | null = null;

  ngOnInit(): void {
    this.loadCourses();
    
    // Listen for courseAdded event to refresh courses list (only in browser)
    if (this.isBrowser) {
    this.courseAddedHandler = () => {
        console.log('CampusCoursesComponent: Received courseAdded event, refreshing courses list...');
      this.loadCourses();
    };
    window.addEventListener('courseAdded', this.courseAddedHandler);
      console.log('CampusCoursesComponent: Registered courseAdded event listener');
    }
  }
  
  ngOnDestroy(): void {
    // Remove event listener to prevent memory leaks (only in browser)
    if (this.isBrowser && this.courseAddedHandler) {
      window.removeEventListener('courseAdded', this.courseAddedHandler);
      this.courseAddedHandler = null;
    }
  }

  /**
   * Load courses from API
   * GET /campus/{campusId}/courses
   * Fetches all courses for the campus and maps them to CourseCard format
   */
  loadCourses(): void {
    this.loadingCourses.set(true);
    
    this.campusApi.getAllCourses().subscribe({
      next: (coursesData) => {
        // Map API response to CourseCard format
        const courseCards: CourseCard[] = coursesData
          .filter(course => course && course.courseName && course.id)
          .map(course => ({
            id: course.id || '',
            name: course.courseName || '',
            fullName: course.description || course.courseName || '',
            seats: course.availableSeats || course.totalSeats || 0,
            duration: course.duration ? `${course.duration} ${course.duration === 1 ? 'year' : 'years'}` : 'N/A',
          }));
        
        this.courses.set(courseCards);
        this.loadingCourses.set(false);
      },
      error: () => {
        this.courses.set([]);
        this.loadingCourses.set(false);
        this.notify.error('Failed to load courses. Please refresh the page or contact support.');
      },
    });
  }

  /**
   * Get course by ID
   * GET /campus/{campusId}/courses/{courseId}
   * Fetches detailed course information by course ID. Validates that the course belongs to the specified campus.
   */
  getCourseById(courseId: string): void {
    if (!courseId || !courseId.trim()) {
      this.notify.error('Course ID is required');
      return;
    }

    this.campusApi.getCourseById(courseId.trim()).subscribe({
      next: (course) => {
        if (course) {
          // You can use this course data for detail view, edit, etc.
          console.log('Course details:', course);
          // Example: Open a detail modal or update UI with course details
        } else {
          this.notify.error('Course not found');
        }
      },
      error: () => {
        this.notify.error('Failed to fetch course details. Please try again.');
      },
    });
  }

  addCourse(): void {
    this.modalService.openModal('course-form');
  }

  /**
   * Delete course by ID
   * DELETE /campus/{campusId}/courses/{courseId}
   * Deletes a course from the campus catalog. Validates that the course belongs to the specified campus.
   */
  deleteCourse(courseId: string, courseName: string): void {
    if (!courseId || !courseId.trim()) {
      this.notify.error('Course ID is required');
      return;
    }

    // Confirm before deleting
    const confirmed = confirm(`Are you sure you want to delete the course "${courseName}"? This action cannot be undone.`);
    if (!confirmed) {
      return;
    }

    this.deletingCourseId.set(courseId);
    
    this.campusApi.deleteCourse(courseId.trim()).subscribe({
      next: (response) => {
        this.deletingCourseId.set(null);
        
        if (response?.success) {
          const message = response.message || 'Course deleted successfully';
          this.notify.success(message);
          // Reload courses list after successful deletion
          this.loadCourses();
        } else {
          this.notify.error('Failed to delete course. Please try again.');
        }
      },
      error: (error) => {
        this.deletingCourseId.set(null);
        const errorMessage = error?.error?.message || error?.message || 'Failed to delete course. Please try again.';
        this.notify.error(errorMessage);
      },
    });
  }
}
