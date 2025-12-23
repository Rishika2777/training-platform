import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

export interface StudentCard {
  id: string;
  name: string;
  campusName: string;
  imageUrl: string;
}

@Component({
  selector: 'app-admin-student',
  standalone: true,
  imports: [CommonModule, ButtonComponent, PaginationComponent],
  templateUrl: './admin-student.component.html',
  styleUrl: './admin-student.component.css',
})
export class AdminStudentComponent {
  readonly announcementDate = 'January 7th, 2025';

  readonly students: readonly StudentCard[] = [
    { id: '1', name: 'Student Name', campusName: 'Campus Name', imageUrl: 'assets/images/login-news-image.png' },
    { id: '2', name: 'Student Name', campusName: 'Campus Name', imageUrl: 'assets/images/landing-card-campus.png' },
    { id: '3', name: 'Student Name', campusName: 'Campus Name', imageUrl: 'assets/images/landing-card-company.png' },
    { id: '4', name: 'Student Name', campusName: 'Campus Name', imageUrl: 'assets/images/landing-card-institution.png' },
    { id: '5', name: 'Student Name', campusName: 'Campus Name', imageUrl: 'assets/images/login-hero-image.png' },
    { id: '6', name: 'Student Name', campusName: 'Campus Name', imageUrl: 'assets/images/login-news-image.png' },
    { id: '7', name: 'Student Name', campusName: 'Campus Name', imageUrl: 'assets/images/landing-card-campus.png' },
    { id: '8', name: 'Student Name', campusName: 'Campus Name', imageUrl: 'assets/images/landing-card-company.png' },
    { id: '9', name: 'Student Name', campusName: 'Campus Name', imageUrl: 'assets/images/landing-card-institution.png' },
  ];

  currentPage = 1;
  readonly itemsPerPage = 9;
  readonly totalPages = 5;

  get displayedStudents(): readonly StudentCard[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.students.slice(start, end);
  }

  onView(student: StudentCard): void {
    console.log('View student:', student);
    // TODO: Implement view action
  }

  onDelete(student: StudentCard): void {
    console.log('Delete student:', student);
    // TODO: Implement delete action
  }

  onPageChange(page: number): void {
    this.currentPage = page;
  }

  onAdd(): void {
    console.log('Add student');
    // TODO: Implement add action
  }
}
