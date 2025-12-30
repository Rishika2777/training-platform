import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ModalService } from '../../../../core/modal/modal.service';

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
export class CampusCoursesComponent {
  private readonly modalService = inject(ModalService);

  readonly courses: readonly CourseCard[] = [
    { id: '1', name: 'BCA', fullName: 'Bachelor of Computer Applications', seats: 30, duration: '3 yr' },
  ];

  addCourse(): void {
    this.modalService.openModal('course-form');
  }
}
