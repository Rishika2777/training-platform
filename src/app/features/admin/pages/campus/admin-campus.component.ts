import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { CardComponent, CardData } from '../../../../shared/components/card/card.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
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
  selectedCampusApprovalStatus: string | null = null;

  showReviewModal = false;
  pendingReviewStatus: EnumLoginStatus | null = null;
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
                name: cleanUiText(campus.campusName) || cleanUiText(campus.email?.split('@')[0]) || 'Campus Name',
                badge: toApprovalStatusLabel(campus.approvalStatus),
                email: cleanUiText(campus.email),
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
         this.selectedCampusApprovalStatus = profile.approvalStatus ?? null;
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
    this.selectedCampusApprovalStatus = null;
  }

  handleReviewAction(status: EnumLoginStatus): void {
    if (!this.selectedCampusId) {
      return;
    }
    if (status !== 'APPROVED' && status !== 'REJECTED') {
      return;
    }
    this.pendingReviewStatus = status;
    this.showReviewModal = true;
  }

  confirmReviewAction(): void {
    if (!this.selectedCampusId || !this.pendingReviewStatus) {
      return;
    }
    if (this.pendingReviewStatus !== 'APPROVED' && this.pendingReviewStatus !== 'REJECTED') {
      return;
    }

    const statusToSubmit = this.pendingReviewStatus;

    // Close review modal immediately
    this.closeReviewModal();
    this.cdr.detectChanges();

    // Show loading state and make API call
    this.viewSubmitting = true;
    this.campusApi.updateCampusApprovalStatus(this.selectedCampusId, { approvalStatus: statusToSubmit }).subscribe({
      next: () => {
        this.viewSubmitting = false;
        this.closeViewModal();
        this.loadCampuses();
        this.cdr.detectChanges();
      },
      error: () => {
        this.viewSubmitting = false;
        this.cdr.detectChanges();
      },
    });
  }

  closeReviewModal(): void {
    this.showReviewModal = false;
    this.pendingReviewStatus = null;
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
    const campusId = this.selectedCampus?.userId ?? null;
    console.log(campusId);
    if (campusId) {
      this.campusApi.deleteCampusByAdmin(campusId).subscribe({
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

  get isSelectedCampusApproved(): boolean {
    return toApprovalStatusLabel(this.selectedCampusApprovalStatus) === 'APPROVED';
  }
}

function toApprovalStatusLabel(status: string | null | undefined): string {
  const cleaned = (status ?? '').trim();
  if (!cleaned) {
    return 'PENDING_APPROVAL';
  }
  // Student endpoints often use "PENDING" while admin screens expect "PENDING_APPROVAL"
  if (cleaned === 'PENDING') {
    return 'PENDING_APPROVAL';
  }
  if (cleaned.toLowerCase() === 'string') {
    return 'PENDING_APPROVAL';
  }
  return cleaned;
}

function cleanUiText(value: string | null | undefined): string {
  const cleaned = (value ?? '').trim();
  if (!cleaned) return '';
  if (cleaned.toLowerCase() === 'string') return '';
  return cleaned;
}
