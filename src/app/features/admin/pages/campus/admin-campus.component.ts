import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { CardComponent, CardData } from '../../../../shared/components/card/card.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { Campus, CampusApiService, CampusRegisterRequest, CampusRegistrationResponse, BulkCampusUploadResponse } from '../../../campus/services/campus-api.service';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { APPROVAL_FILTER_ITEMS, EnumLoginStatus } from '../../../../core/config/app.constants';
import { AuthService } from '../../../../core/auth/auth.service';
import {
  CampusFormComponent,
  CampusFormValue,
} from '../../../../shared/components/forms/campus-form/campus-form.component';
import { DropdownComponent } from '../../../../shared/components/dropdown/dropdown.component';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-admin-campus',
  standalone: true,
  imports: [CommonModule, CardComponent, PaginationComponent, ModalComponent, ButtonComponent, CampusFormComponent, DropdownComponent],
  templateUrl: './admin-campus.component.html',
  styleUrl: './admin-campus.component.css',
})
export class AdminCampusComponent implements OnInit {
  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef<HTMLInputElement>;

  private readonly campusApi = inject(CampusApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly notify = inject(NotificationService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly announcementDate = 'January 7th, 2025';

  uploadingTemplate = false;

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

  selectedApprovalFilter = '';
  readonly approvalFilterItems = APPROVAL_FILTER_ITEMS;

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

  onApprovalFilterChange(value: string): void {
    this.selectedApprovalFilter = value ?? '';
    this.cdr.detectChanges();
    this.loadCampuses();
  }

  private loadCampuses(): void {
    this.isLoading = true;
    this.campuses = [];
    this.displayedCampuses = [];
    
    const approvalStatus = this.selectedApprovalFilter || undefined;
    this.campusApi.getAllCampuses(approvalStatus as 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | undefined).subscribe({
      next: (campuses: readonly Campus[]) => {
        try {
          const list = campuses && Array.isArray(campuses) ? [...campuses] : [];
          if (list.length > 0) {
            this.campuses = list.map((campus) => {
              const imageUrl = cleanUiText(
                readFirstNonEmptyString(campus as unknown, ['photoUrl', 'campusLogoUrl', 'logoUrl', 'imageUrl']),
              );
              const cardData: CardData = {
                id: campus.campusId ?? campus.id ?? `campus-${Math.random().toString(36).substr(2, 9)}`,
                name: cleanUiText(campus.campusName) || cleanUiText(campus.email?.split('@')[0]) || 'Campus Name',
                badge: toApprovalStatusLabel(campus.approvalStatus),
                email: cleanUiText(campus.email),
                imageUrl: imageUrl || undefined,
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
    const isAdminRoute = this.router.url.includes('/admin/campus');
    
    // On admin route, we only need userId. Otherwise, we need both userId and userType
    if (!currentUser?.userId || (!isAdminRoute && !currentUser.userType)) {
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

    // Prepare options - include userType as 'ADMIN' if on admin route, otherwise use current user's type
    const options = {
      userId: currentUser.userId,
      ...(isAdminRoute ? { userType: 'ADMIN' as const } : currentUser.userType ? { userType: currentUser.userType } : {}),
    };

    const photo = value.campusLogoFiles?.length ? value.campusLogoFiles[0] : null;
    this.campusApi
      .registerCampus(registerRequest, options, photo)
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

  downloadTemplate(): void {
    const headers = [
      'Campus Name',
      'Campus Rank',
      'Admin Name',
      'Admin Email',
      'Admin Phone',
      'Admin Department (Optional)',
      'Admin Designation',
      'Website URL (Optional)',
      'About Campus (Optional)',
      'Campus Address',
    ];

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([headers]);

    // Set column widths for better readability
    const columnWidths = [
      { wch: 20 }, // Campus Name
      { wch: 12 }, // Campus Rank
      { wch: 20 }, // Admin Name
      { wch: 25 }, // Admin Email
      { wch: 15 }, // Admin Phone
      { wch: 25 }, // Admin Department (Optional)
      { wch: 20 }, // Admin Designation
      { wch: 30 }, // Website URL (Optional)
      { wch: 40 }, // About Campus (Optional)
      { wch: 30 }, // Campus Address
    ];
    worksheet['!cols'] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Campus Registration');

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { 
      bookType: 'xlsx', 
      type: 'array' 
    });

    // Create blob and download
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', 'campus_registration_template.xlsx');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.notify.success('Template downloaded successfully');
  }

  triggerFileUpload(): void {
    if (this.fileInput) {
      this.fileInput.nativeElement.click();
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    // Validate file extension (.xlsx or .xls)
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      this.notify.error('Please select an Excel file (.xlsx or .xls)');
      return;
    }

    this.uploadBulkCampuses(file);
  }

  private uploadBulkCampuses(file: File): void {
    if (this.uploadingTemplate) {
      return;
    }

    this.uploadingTemplate = true;

    this.campusApi.bulkUploadCampuses(file).subscribe({
      next: (response: BulkCampusUploadResponse | null) => {
        this.uploadingTemplate = false;
        
        if (response) {
          const totalRows = response.totalRows || 0;
          const successfulRows = response.successfulRows || 0;
          const failedRows = response.failedRows || 0;
          
          if (failedRows === 0) {
            this.notify.success(`Bulk upload completed successfully! ${successfulRows} campus(es) uploaded.`);
          } else {
            this.notify.warn(
              `Bulk upload completed with some errors. ${successfulRows} successful, ${failedRows} failed out of ${totalRows} total rows.`
            );
          }
          
          // Reload campuses list to show newly uploaded campuses
          this.loadCampuses();
        } else {
          this.notify.error('Bulk upload completed but received invalid response.');
        }
        
        if (this.fileInput) {
          this.fileInput.nativeElement.value = '';
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.uploadingTemplate = false;
        let errorMessage = 'Failed to upload file. Please try again.';
        
        if (error && typeof error === 'object') {
          if ('error' in error && error.error) {
            const errorObj = error.error as { message?: string; error?: string };
            errorMessage = errorObj.message || errorObj.error || errorMessage;
          } else if ('message' in error) {
            errorMessage = String(error.message);
          }
        }
        
        this.notify.error(errorMessage);
        if (this.fileInput) {
          this.fileInput.nativeElement.value = '';
        }
        this.cdr.detectChanges();
      },
    });
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

function readFirstNonEmptyString(obj: unknown, keys: readonly string[]): string {
  if (!obj || typeof obj !== 'object') {
    return '';
  }
  const rec = obj as Record<string, unknown>;
  for (const key of keys) {
    const val = rec[key];
    if (typeof val === 'string' && val.trim().length > 0) {
      return val;
    }
  }
  return '';
}
