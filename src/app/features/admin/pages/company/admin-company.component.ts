import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { CardComponent, CardData } from '../../../../shared/components/card/card.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { AdminApiService } from '../../services/admin-api.service';
import {
  CompanyApiService,
  CompanyRegisterRequest,
  CompanyRegistrationResponse,
} from '../../../company/services/company-api.service';
import {
  CompanyFormComponent,
  CompanyFormValue,
} from '../../../../shared/components/forms/company-form/company-form.component';
import { EnumLoginStatus } from '../../../../core/config/app.constants';
import { NotificationService } from '../../../../core/notifications/notification.service';

@Component({
  selector: 'app-admin-company',
  standalone: true,
  imports: [CommonModule, CardComponent, PaginationComponent, ModalComponent, ButtonComponent, CompanyFormComponent],
  templateUrl: './admin-company.component.html',
  styleUrl: './admin-company.component.css',
})
export class AdminCompanyComponent implements OnInit {
  private readonly adminApi = inject(AdminApiService);
  private readonly companyApi = inject(CompanyApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly notify = inject(NotificationService);
  readonly announcementDate = 'January 7th, 2025';

  companies: CardData[] = [];
  displayedCompanies: CardData[] = [];
  isLoading = false;

  showDeleteModal = false;
  selectedCompany: CardData | null = null;

  showViewModal = false;
  viewSubmitting = false;
  selectedCompanyId: string | null = null;
  selectedCompanyUserId: string | null = null;
  selectedCompanyApprovalStatus: string | null = null;
  viewValue: CompanyFormValue = CompanyFormComponent.createEmptyValue();
  isEditMode = false;

  showReviewModal = false;
  pendingReviewStatus: EnumLoginStatus | null = null;

  currentPage = 1;
  readonly itemsPerPage = 9;
  totalPages = 1;

  ngOnInit(): void {
    this.loadCompanies();
  }

  private loadCompanies(): void {
    this.isLoading = true;
    this.companies = [];
    this.displayedCompanies = [];
    
    this.companyApi.getAllCompanies('ADMIN').subscribe({
      next: (companies: readonly CompanyRegistrationResponse[]) => {
        try {
          if (companies && Array.isArray(companies) && companies.length > 0) {
            this.companies = companies.map((company) => {
              const cardData: CardData = {
                id: company.companyId ?? `company-${Math.random().toString(36).substr(2, 9)}`,
                name: cleanUiText(company.companyName) || cleanUiText(company.email?.split('@')[0]) || 'Company Name',
                badge: toApprovalStatusLabel(company.approvalStatus),
                email: cleanUiText(company.email) || cleanUiText(company.adminEmail),
                // We don't get a "userId" here for admin user deletion; keep undefined.
                userId: undefined,
              };
              return cardData;
            });
            this.totalPages = Math.max(1, Math.ceil(this.companies.length / this.itemsPerPage));
            this.currentPage = 1;
            this.updateDisplayedCompanies();
          } else {
            this.companies = [];
            this.displayedCompanies = [];
            this.totalPages = 1;
          }
        } catch {
          this.companies = [];
          this.displayedCompanies = [];
          this.totalPages = 1;
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.companies = [];
        this.displayedCompanies = [];
        this.totalPages = 1;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private updateDisplayedCompanies(): void {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.displayedCompanies = [...this.companies.slice(start, end)];
  }

  onView(company: CardData): void {
    if (!company.id) {
      return;
    }

    this.viewSubmitting = true;
    this.companyApi.getCompanyById(company.id).subscribe({
      next: (profile) => {
        this.viewSubmitting = false;
        if (!profile?.companyId) {
          return;
        }
        this.selectedCompanyId = profile.companyId;
        this.selectedCompanyUserId = profile.userId ?? null;
        this.selectedCompanyApprovalStatus = profile.approvalStatus ?? null;
        this.viewValue = this.mapProfileToFormValue(profile);
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
    this.selectedCompanyId = null;
    this.selectedCompanyUserId = null;
    this.selectedCompanyApprovalStatus = null;
    this.viewValue = CompanyFormComponent.createEmptyValue();
    this.isEditMode = false;
  }

  private reloadCompanyProfile(): void {
    if (!this.selectedCompanyId) {
      return;
    }

    this.viewSubmitting = true;
    this.companyApi.getCompanyById(this.selectedCompanyId).subscribe({
      next: (profile) => {
        this.viewSubmitting = false;
        if (!profile?.companyId) {
          return;
        }
        // Update all the selected company data
        this.selectedCompanyId = profile.companyId;
        this.selectedCompanyUserId = profile.userId ?? null;
        this.selectedCompanyApprovalStatus = profile.approvalStatus ?? null;
        // Update form with fresh data
        this.viewValue = this.mapProfileToFormValue(profile);
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

  toggleEditMode(): void {
    this.isEditMode = !this.isEditMode;
  }

  handleFormSubmit(value: CompanyFormValue): void {
    if (!this.isEditMode || !this.selectedCompanyId) {
      return;
    }

    const userIdForUpdate = this.selectedCompanyUserId ?? this.selectedCompanyId;
    const updateRequest = this.mapFormValueToUpdateRequest(value);
    this.viewSubmitting = true;

    this.companyApi.updateCompany(this.selectedCompanyId, userIdForUpdate, updateRequest).subscribe({
      next: () => {
        // Show success notification
        this.notify.success('Company profile updated successfully');
        // Reload the company profile to get updated data
        this.reloadCompanyProfile();
        // Reload companies list in background (don't wait for it)
        this.loadCompanies();
      },
      error: () => {
        this.viewSubmitting = false;
        this.cdr.detectChanges();
      },
    });
  }

  private mapFormValueToUpdateRequest(value: CompanyFormValue): CompanyRegisterRequest {
    return {
      companyName: value.companyName || '',
      companyLogoUrl: value.companyPhoto ? value.companyPhoto.name : undefined,
      adminName: value.adminName || '',
      adminDesignation: value.adminDesignation || '',
      adminEmail: value.adminEmail || '',
      adminPhone: value.adminPhone || '',
      websiteUrl: value.companyWebsiteUrl || '',
      otherWebsiteUrl: value.otherWebsiteUrl || '',
      registerNumber: value.registerNumber || '',
      keyPeople: value.keyPeople.map((p) => ({
        name: p.name || '',
        designation: p.designation || '',
        photoUrl: p.photo ? p.photo.name : undefined,
      })),
      aboutCompany: value.aboutCompany || '',
      companyAddress: value.companyAddress || '',
    };
  }

  handleReviewAction(status: EnumLoginStatus): void {
    if (!this.selectedCompanyId) {
      return;
    }
    if (status !== 'APPROVED' && status !== 'REJECTED') {
      return;
    }
    this.pendingReviewStatus = status;
    this.showReviewModal = true;
  }

  confirmReviewAction(): void {
    if (!this.selectedCompanyId || !this.pendingReviewStatus) {
      return;
    }
    if (this.pendingReviewStatus !== 'APPROVED' && this.pendingReviewStatus !== 'REJECTED') {
      return;
    }

    // Store status before closing modal (since closeReviewModal sets it to null)
    const statusToUpdate = this.pendingReviewStatus;

    // Close review modal immediately
    this.closeReviewModal();
    this.cdr.detectChanges();

    // Show loading state and make API call
    this.viewSubmitting = true;
    this.companyApi
      .updateCompanyApprovalStatus(this.selectedCompanyId, 'ADMIN', { approvalStatus: statusToUpdate })
      .subscribe({
        next: () => {
          this.viewSubmitting = false;
          this.closeViewModal();
          this.loadCompanies();
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

  onDelete(company: CardData): void {
    this.selectedCompany = company;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    const companyId = this.selectedCompany?.id;
    if (companyId) {
      this.companyApi.deleteCompany(companyId).subscribe({
        next: () => {
          // Show success notification
          this.notify.success('Company deleted successfully');
          this.closeDeleteModal();
          // Reset to first page if current page might be empty after deletion
          if (this.displayedCompanies.length === 1 && this.currentPage > 1) {
            this.currentPage = 1;
          }
          this.loadCompanies();
        },
        error: () => {
          this.closeDeleteModal();
        },
      });
    }
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.selectedCompany = null;
  }

  onApprove(company: CardData): void {
    if (company.id) {
      this.companyApi
        .updateCompanyApprovalStatus(company.id, 'ADMIN', { approvalStatus: 'APPROVED' })
        .subscribe({ next: () => this.loadCompanies() });
    }
  }

  onReject(company: CardData): void {
    if (company.id && confirm('Are you sure you want to reject this company?')) {
      this.companyApi
        .updateCompanyApprovalStatus(company.id, 'ADMIN', { approvalStatus: 'REJECTED' })
        .subscribe({ next: () => this.loadCompanies() });
    }
  }

  private mapProfileToFormValue(profile: CompanyRegistrationResponse): CompanyFormValue {
    const aboutCompany = readFirstNonEmptyString(profile, ['aboutCompany', 'description', 'about']);
    const companyAddress = readFirstNonEmptyString(profile, ['companyAddress', 'address']);

    return {
      ...CompanyFormComponent.createEmptyValue(),
      companyName: profile.companyName ?? '',
      // Store photo URL from API response for display
      companyPhoto: null,
      companyPhotoUrl: profile.companyLogoUrl ?? undefined,
      adminName: profile.adminName ?? '',
      adminDesignation: profile.adminDesignation ?? '',
      adminEmail: profile.adminEmail ?? profile.email ?? '',
      adminPhone: profile.adminPhone ?? '',
      companyWebsiteUrl: profile.websiteUrl ?? '',
      otherWebsiteUrl: profile.otherWebsiteUrl ?? '',
      registerNumber: profile.registerNumber ?? '',
      keyPeople:
        profile.keyPeople && profile.keyPeople.length > 0
          ? profile.keyPeople.map((p) => ({
              name: p.name ?? '',
              designation: p.designation ?? '',
              photo: null,
              photoUrl: p.photoUrl ?? undefined,
            }))
          : [CompanyFormComponent.createEmptyKeyPerson()],
      aboutCompany,
      companyAddress,
    };
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updateDisplayedCompanies();
  }

  onAdd(): void {
    // Add company functionality
  }

  get isSelectedCompanyApproved(): boolean {
    const status = toApprovalStatusLabel(this.selectedCompanyApprovalStatus);
    return status === 'APPROVED' || status === 'REJECTED';
  }
}

function toApprovalStatusLabel(status: string | null | undefined): string {
  const cleaned = (status ?? '').trim();
  if (!cleaned) {
    return 'PENDING_APPROVAL';
  }
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


