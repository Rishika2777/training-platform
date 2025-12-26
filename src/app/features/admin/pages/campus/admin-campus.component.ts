import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { CardComponent, CardData } from '../../../../shared/components/card/card.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { AdminApiService } from '../../services/admin-api.service';
import { Campus, CampusApiService } from '../../../campus/services/campus-api.service';
import { EnumLoginStatus } from '../../../../core/config/app.constants';
import {
  CampusFormComponent,
  CampusFormValue,
} from '../../../../shared/components/forms/campus-form/campus-form.component';

@Component({
  selector: 'app-admin-campus',
  standalone: true,
  imports: [CommonModule, CardComponent, PaginationComponent, ModalComponent, ButtonComponent, CampusFormComponent],
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

  showViewModal = false;
  viewSubmitting = false;
  selectedCampusId: string | null = null;
  viewValue: CampusFormValue = {
    campusName: '',
    campusLogoUrl: '',
    campusLogoFiles: null,
    rank: '',
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    adminDept: '',
    adminDesignation: '',
    website: '',
    about: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  };

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
                userId: campus.id ?? null,
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
     const userId = campus.userId ?? null;
     const campusId = campus.id ?? null;
     // Prefer userId for view/approval operations (as requested).
     const idToUse = userId ?? campusId;
      if (!idToUse) {
      return;
    }

    this.viewSubmitting = true;
    this.campusApi.getCampusById(idToUse).subscribe({
      next: (profile) => {
        this.viewSubmitting = false;
        if (!profile?.campusId && !profile?.id) {
          return;
        }
         // Use userId for subsequent approval call (as requested). Fallback to the id we used to fetch.
         this.selectedCampusId = profile.userId ?? userId ?? idToUse;
        this.viewValue = this.mapCampusToFormValue(profile);
        this.showViewModal = true;
        this.cdr.detectChanges();
      },
      error: () => {
        this.viewSubmitting = false;
      },
    });
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.selectedCampusId = null;
  }

  handleReviewAction(status: EnumLoginStatus): void {
    if (!this.selectedCampusId) {
      return;
    }
    if (status !== 'APPROVED' && status !== 'REJECTED') {
      return;
    }
    if (status === 'REJECTED' && !confirm('Are you sure you want to reject this campus?')) {
      return;
    }

    this.viewSubmitting = true;
    this.campusApi.updateCampusApprovalStatus(this.selectedCampusId, { approvalStatus: status }).subscribe({
      next: () => {
        this.viewSubmitting = false;
        this.closeViewModal();
        this.loadCampuses();
      },
      error: () => {
        this.viewSubmitting = false;
      },
    });
  }

  private mapCampusToFormValue(profile: Campus): CampusFormValue {
    return {
      campusName: profile.campusName ?? '',
      campusLogoUrl: profile.photoUrl ?? '',
      campusLogoFiles: null,
      rank: profile.campusRank !== undefined && profile.campusRank !== null ? String(profile.campusRank) : '',
      adminName: profile.adminName ?? '',
      adminEmail: profile.adminEmail ?? profile.email ?? '',
      adminPhone: profile.adminPhone ?? '',
      adminDept: profile.adminDepartment ?? '',
      adminDesignation: profile.adminDesignation ?? '',
      website: profile.campusWebsiteUrl ?? '',
      about: profile.aboutCampus ?? '',
      address: profile.campusAddress ?? '',
      city: '',
      state: '',
      pincode: '',
    };
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
