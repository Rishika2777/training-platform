import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { CardComponent, CardData } from '../../../../shared/components/card/card.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { Campus, CampusApiService, CampusRegisterRequest, CampusRegistrationResponse } from '../../../campus/services/campus-api.service';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { EnumLoginStatus } from '../../../../core/config/app.constants';
import { AuthService } from '../../../../core/auth/auth.service';
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
  private readonly notify = inject(NotificationService);
  private readonly auth = inject(AuthService);
  readonly announcementDate = 'January 7th, 2025';

  campuses: CardData[] = [];
  displayedCampuses: CardData[] = [];
  isLoading = false;

  showDeleteModal = false;
  selectedCampus: CardData | null = null;

  showViewModal = false;
  viewSubmitting = false;
  selectedCampusId: string | null = null;
  selectedCampusCardId: string | null = null; // Store original campus.id from CardData
  selectedCampusApiId: string | null = null; // Store id from API response (e.g., "695aa2b47a36e910639a5829")
  selectedCampusEmail: string | null = null;
  selectedCampusApprovalStatus: string | null = null;
  isEditMode = false;

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

  showCreateModal = false;
  createSubmitting = false;
  createFormValue: CampusFormValue = {
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

    // Store the original campus.id from CardData for approval status updates
    this.selectedCampusCardId = campus.id ?? null;

    this.viewSubmitting = true;
    this.campusApi.getCampusById(idToUse).subscribe({
      next: (profile) => {
        this.viewSubmitting = false;
        if (!profile?.campusId && !profile?.id) {
          return;
        }
         // Use actual campusId from the response for update operations
         const actualCampusId = profile.campusId ?? profile.id;
         if (actualCampusId) {
           this.selectedCampusId = actualCampusId;
         }
         // Store the id field from API response (e.g., "695aa2b47a36e910639a5829") for approval status updates
         if (profile.id) {
           this.selectedCampusApiId = profile.id;
         }
         // Store email for approval status updates
         this.selectedCampusEmail = profile.email ?? profile.adminEmail ?? null;
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
    this.selectedCampusCardId = null;
    this.selectedCampusApiId = null;
    this.selectedCampusEmail = null;
    this.selectedCampusApprovalStatus = null;
    this.isEditMode = false;
  }

  toggleEditMode(): void {
    this.isEditMode = !this.isEditMode;
  }

  handleFormSubmit(value: CampusFormValue): void {
    if (!this.isEditMode || !this.selectedCampusApiId) {
      return;
    }

    const updateRequest = this.mapFormValueToUpdateRequest(value);
    this.viewSubmitting = true;

    this.campusApi.updateCampusByAdmin(this.selectedCampusApiId, updateRequest).subscribe({
      next: () => {
        // Show success notification
        this.notify.success('Campus profile updated successfully');
        // Reload the campus profile to get updated data
        this.reloadCampusProfile();
        // Reload campuses list in background (don't wait for it)
        this.loadCampuses();
      },
      error: () => {
        this.viewSubmitting = false;
        this.cdr.detectChanges();
      },
    });
  }

  private reloadCampusProfile(): void {
    if (!this.selectedCampusApiId) {
      return;
    }

    this.viewSubmitting = true;
    this.campusApi.getCampusById(this.selectedCampusApiId).subscribe({
      next: (profile) => {
        this.viewSubmitting = false;
        if (!profile?.campusId && !profile?.id) {
          return;
        }
        // Use actual campusId from the response for update operations
        const actualCampusId = profile.campusId ?? profile.id;
        if (actualCampusId) {
          this.selectedCampusId = actualCampusId;
        }
        // Store the id field from API response
        if (profile.id) {
          this.selectedCampusApiId = profile.id;
        }
        // Store email for approval status updates
        this.selectedCampusEmail = profile.email ?? profile.adminEmail ?? null;
        this.selectedCampusApprovalStatus = profile.approvalStatus ?? null;
        // Update form with fresh data
        this.viewValue = this.mapCampusToFormValue(profile);
        // Exit edit mode to show approve/reject buttons and hide update button
        this.isEditMode = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.viewSubmitting = false;
        this.cdr.detectChanges();
      },
    });
  }

  private mapFormValueToUpdateRequest(value: CampusFormValue): CampusRegisterRequest {
    return {
      campusName: value.campusName || '',
      campusLogoUrl: value.campusLogoUrl || '',
      campusRank: value.rank ? parseInt(value.rank, 10) : 0,
      adminName: value.adminName || '',
      adminEmail: value.adminEmail || '',
      adminPhone: value.adminPhone || '',
      adminDepartment: value.adminDept || '',
      adminDesignation: value.adminDesignation || '',
      websiteUrl: value.website || '',
      aboutCampus: value.about || '',
      campusAddress: value.address || '',
    };
  }

  handleReviewAction(status: EnumLoginStatus): void {
    if (!this.selectedCampusApiId) {
      return;
    }
    if (status !== 'APPROVED' && status !== 'REJECTED') {
      return;
    }
    this.pendingReviewStatus = status;
    this.showReviewModal = true;
  }

  confirmReviewAction(): void {
    if (!this.selectedCampusApiId || !this.pendingReviewStatus) {
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
    this.campusApi.updateCampusApprovalStatus(this.selectedCampusApiId, { approvalStatus: statusToSubmit }).subscribe({
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
    if (campusId) {
      this.campusApi.deleteCampusByAdmin(campusId).subscribe({
        next: () => {
          // Show success notification
          this.notify.success('Campus deleted successfully');
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
    // Reset form to empty state
    this.createFormValue = {
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
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.createFormValue = {
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
  }

  handleCreateSubmit(value: CampusFormValue): void {
    if (this.createSubmitting) {
      return;
    }

    const currentUser = this.auth.getCurrentUser();
    if (!currentUser?.userId || !currentUser.userType) {
      this.notify.error('Missing auth context. Please sign in and try again.');
      return;
    }

    this.createSubmitting = true;

    const registerRequest: CampusRegisterRequest = {
      campusName: value.campusName || '',
      campusLogoUrl: value.campusLogoUrl || '',
      campusRank: value.rank ? parseInt(value.rank, 10) : 0,
      adminName: value.adminName || '',
      adminEmail: value.adminEmail.toLowerCase() || '',
      adminPhone: value.adminPhone || '',
      adminDepartment: value.adminDept || '',
      adminDesignation: value.adminDesignation || '',
      websiteUrl: value.website || '',
      aboutCampus: value.about || '',
      campusAddress: value.address || '',
    };

    this.campusApi
      .registerCampus(registerRequest, {
        userId: currentUser.userId,
        userType: currentUser.userType,
      })
      .subscribe({
        next: (response: CampusRegistrationResponse | null) => {
          this.createSubmitting = false;
          if (response) {
            this.notify.success('Campus created successfully!');
            this.closeCreateModal();
            // Reload campuses list
            this.loadCampuses();
          } else {
            this.notify.error('Failed to create campus. Please try again.');
          }
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.createSubmitting = false;
          let errorMessage = 'Failed to create campus. Please try again.';
          
          if (error && typeof error === 'object') {
            if ('error' in error && error.error) {
              const errorObj = error.error as { message?: string; error?: string };
              errorMessage = errorObj.message || errorObj.error || errorMessage;
            } else if ('message' in error) {
              errorMessage = String(error.message);
            }
          }
          
          this.notify.error(errorMessage);
          this.cdr.detectChanges();
        },
      });
  }

  handleCreateCancel(): void {
    this.closeCreateModal();
  }

  get isSelectedCampusApproved(): boolean {
    const status = toApprovalStatusLabel(this.selectedCampusApprovalStatus);
    return status === 'APPROVED' || status === 'REJECTED';
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
