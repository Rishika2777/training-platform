import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { CardComponent, CardData } from '../../../../shared/components/card/card.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { AdminApiService } from '../../services/admin-api.service';
import { Campus, CampusApiService } from '../../../campus/services/campus-api.service';

@Component({
  selector: 'app-admin-campus',
  standalone: true,
  imports: [CommonModule, CardComponent, PaginationComponent, ModalComponent, ButtonComponent],
  templateUrl: './admin-campus.component.html',
  styleUrl: './admin-campus.component.css',
})
export class AdminCampusComponent implements OnInit {
  private readonly adminApi = inject(AdminApiService);
  private readonly campusApi = inject(CampusApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly announcementDate = 'January 7th, 2025';

  campuses: CardData[] = [];
  displayedCampuses: CardData[] = [];
  isLoading = false;

  showDeleteModal = false;
  selectedCampus: CardData | null = null;

  currentPage = 1;
  readonly itemsPerPage = 9;
  totalPages = 1;

  ngOnInit(): void {
    this.loadCampuses();
  }

  private loadCampuses(): void {
    this.isLoading = true;
    this.campuses = [];
    this.displayedCampuses = [];
    
    this.campusApi.getAllCampuses().subscribe({
      next: (campuses: readonly Campus[]) => {
        try {
          if (campuses && Array.isArray(campuses) && campuses.length > 0) {
            this.campuses = campuses.map((campus) => {
              const cardData: CardData = {
                id: campus.campusId ?? campus.id ?? `campus-${Math.random().toString(36).substr(2, 9)}`,
                name: campus.campusName ?? campus.email?.split('@')[0] ?? 'Campus Name',
                imageUrl: campus.photoUrl ?? 'assets/images/landing-card-campus.png',
                email: campus.email ?? '',
                // Admin actions still operate on a "user id". API doesn't provide it here, so leave undefined.
                userId: undefined,
              };
              return cardData;
            });
            this.totalPages = Math.max(1, Math.ceil(this.campuses.length / this.itemsPerPage));
            this.currentPage = 1;
            this.updateDisplayedCampuses();
          } else {
            this.campuses = [];
            this.displayedCampuses = [];
            this.totalPages = 1;
          }
        } catch {
          this.campuses = [];
          this.displayedCampuses = [];
          this.totalPages = 1;
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.campuses = [];
        this.displayedCampuses = [];
        this.totalPages = 1;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private updateDisplayedCampuses(): void {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.displayedCampuses = [...this.campuses.slice(start, end)];
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updateDisplayedCampuses();
  }

  onView(campus: CardData): void {
    if (campus.userId) {
      this.adminApi.getUserById(campus.userId).subscribe();
    }
  }

  onDelete(campus: CardData): void {
    this.selectedCampus = campus;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (this.selectedCampus?.userId) {
      this.adminApi.deleteUser(this.selectedCampus.userId).subscribe({
        next: () => {
          this.closeDeleteModal();
          // Reset to first page if current page might be empty after deletion
          if (this.displayedCampuses.length === 1 && this.currentPage > 1) {
            this.currentPage = 1;
          }
          this.loadCampuses();
        },
        error: () => {
          this.closeDeleteModal();
        },
      });
    }
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.selectedCampus = null;
  }

  onAdd(): void {
    // TODO: Implement add action
  }
}
