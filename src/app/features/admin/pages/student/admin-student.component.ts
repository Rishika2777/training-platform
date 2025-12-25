import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { CardComponent, CardData } from '../../../../shared/components/card/card.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { AdminApiService } from '../../services/admin-api.service';
import { UserResponse } from '../../models/admin-api.models';

@Component({
  selector: 'app-admin-student',
  standalone: true,
  imports: [CommonModule, CardComponent, PaginationComponent, ModalComponent, ButtonComponent],
  templateUrl: './admin-student.component.html',
  styleUrl: './admin-student.component.css',
})
export class AdminStudentComponent implements OnInit {
  private readonly adminApi = inject(AdminApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly announcementDate = 'January 7th, 2025';

  students: CardData[] = [];
  displayedStudents: CardData[] = [];
  isLoading = false;

  showDeleteModal = false;
  selectedStudent: CardData | null = null;

  currentPage = 1;
  readonly itemsPerPage = 9;
  totalPages = 1;

  ngOnInit(): void {
    this.loadStudents();
  }

  private loadStudents(): void {
    this.isLoading = true;
    this.students = [];
    this.displayedStudents = [];
    
    this.adminApi.getUsersByType('STUDENT').subscribe({
      next: (users: UserResponse[]) => {
        try {
          if (users && Array.isArray(users) && users.length > 0) {
            this.students = users.map((user) => {
              const cardData: CardData = {
                id: user.userId ?? `student-${Math.random().toString(36).substr(2, 9)}`,
                name: user.email?.split('@')[0] ?? 'Student Name',
                imageUrl: 'assets/images/login-news-image.png',
                secondaryInfo: 'Campus Name',
                email: user.email ?? 'student@example.com',
                userId: user.userId,
              };
              return cardData;
            });
            this.totalPages = Math.max(1, Math.ceil(this.students.length / this.itemsPerPage));
            this.currentPage = 1;
            this.updateDisplayedStudents();
          } else {
            this.students = [];
            this.displayedStudents = [];
            this.totalPages = 1;
          }
        } catch {
          this.students = [];
          this.displayedStudents = [];
          this.totalPages = 1;
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.students = [];
        this.displayedStudents = [];
        this.totalPages = 1;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private updateDisplayedStudents(): void {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.displayedStudents = [...this.students.slice(start, end)];
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updateDisplayedStudents();
  }

  onView(student: CardData): void {
    if (student.userId) {
      this.adminApi.getUserById(student.userId).subscribe();
    }
  }

  onDelete(student: CardData): void {
    this.selectedStudent = student;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (this.selectedStudent?.userId) {
      this.adminApi.deleteUser(this.selectedStudent.userId).subscribe({
        next: () => {
          this.closeDeleteModal();
          // Reset to first page if current page might be empty after deletion
          if (this.displayedStudents.length === 1 && this.currentPage > 1) {
            this.currentPage = 1;
          }
          this.loadStudents();
        },
        error: () => {
          this.closeDeleteModal();
        },
      });
    }
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.selectedStudent = null;
  }

  onApprove(student: CardData): void {
    if (student.id) {
      this.adminApi
        .approveStudent(student.id, { status: 'APPROVED', comment: 'Approved by admin' })
        .subscribe({
          next: () => {
            this.loadStudents();
          },
        });
    }
  }

  onReject(student: CardData): void {
    if (student.id && confirm('Are you sure you want to reject this student?')) {
      this.adminApi
        .approveStudent(student.id, { status: 'REJECTED', comment: 'Rejected by admin' })
        .subscribe({
          next: () => {
            this.loadStudents();
          },
        });
    }
  }

  onAdd(): void {
    // Add student functionality
  }
}
