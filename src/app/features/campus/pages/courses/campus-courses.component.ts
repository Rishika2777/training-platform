import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
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
export class CampusCoursesComponent implements OnInit {
  private readonly modalService = inject(ModalService);
  private readonly campusApi = inject(CampusApiService);
  private readonly notify = inject(NotificationService);

  readonly courses = signal<readonly CourseCard[]>([]);
  readonly loadingCourses = signal(false);
  readonly deletingCourseId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadCourses();
  }

  /**
   * Load courses from API
   * GET /courses
   * Fetches all courses and maps them to CourseCard format
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
            duration: course.duration ? `${course.duration} ${course.duration === 1 ? 'month' : 'months'}` : 'N/A',
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
   * GET /courses/{courseId}
   * Fetches detailed course information by course ID
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
   * DELETE /courses/{courseId}
   * Deletes a course from the campus catalog
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
