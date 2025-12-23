import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

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
  readonly courses: readonly CourseCard[] = [
    { id: '1', name: 'BCA', fullName: 'Bachelor of Computer Applications', seats: 30, duration: '3 yr' },
  ];

  addCourse(): void {
    // TODO: Open add course modal or form
  }
}
