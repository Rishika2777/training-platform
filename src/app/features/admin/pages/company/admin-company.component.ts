import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { CardComponent, CardData } from '../../../../shared/components/card/card.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import {
  BulkUploadResponse,
  CompanyApiService,
  CompanyRegisterFiles,
  CompanyRegisterPayload,
  CompanyRegisterRequest,
  CompanyRegistrationResponse,
} from '../../../company/services/company-api.service';
import {
  CompanyFormComponent,
  CompanyFormValue,
} from '../../../../shared/components/forms/company-form/company-form.component';
import { DropdownComponent } from '../../../../shared/components/dropdown/dropdown.component';
import { APPROVAL_FILTER_ITEMS, EnumLoginStatus } from '../../../../core/config/app.constants';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { AuthService } from '../../../../core/auth/auth.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-admin-company',
  standalone: true,
  imports: [CommonModule, CardComponent, PaginationComponent, ModalComponent, ButtonComponent, CompanyFormComponent, DropdownComponent],
  templateUrl: './admin-company.component.html',
  styleUrl: './admin-company.component.css',
})
export class AdminCompanyComponent implements OnInit {
  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef<HTMLInputElement>;

  private readonly companyApi = inject(CompanyApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly notify = inject(NotificationService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly announcementDate = 'January 7th, 2025';

  uploadingTemplate = false;

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

  selectedApprovalFilter = '';
  readonly approvalFilterItems = APPROVAL_FILTER_ITEMS;

  showCreateModal = false;
  createSubmitting = false;
  createFormValue: CompanyFormValue = CompanyFormComponent.createEmptyValue();

  ngOnInit(): void {
    this.loadCompanies();
  }

  onApprovalFilterChange(value: string): void {
    this.selectedApprovalFilter = value ?? '';
    this.cdr.detectChanges();
    this.loadCompanies();
  }

  private loadCompanies(): void {
    this.isLoading = true;
    this.companies = [];
    this.displayedCompanies = [];
    
    const approvalStatus = this.selectedApprovalFilter || undefined;
    this.companyApi.getAllCompanies('ADMIN', approvalStatus as 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | undefined).subscribe({
      next: (companies: readonly CompanyRegistrationResponse[]) => {
        try {
          const list = companies && Array.isArray(companies) ? [...companies] : [];
          if (list.length > 0) {
            this.companies = list.map((company) => {
              const imageUrl = cleanUiText(
                readFirstNonEmptyString(company, ['companyLogoUrl', 'logoUrl', 'imageUrl']),
              );
              const cardData: CardData = {
                id: company.companyId ?? `company-${Math.random().toString(36).substr(2, 9)}`,
                name: cleanUiText(company.companyName) || cleanUiText(company.email?.split('@')[0]) || 'Company Name',
                badge: toApprovalStatusLabel(company.approvalStatus),
                email: cleanUiText(company.email) || cleanUiText(company.adminEmail),
                imageUrl: imageUrl || undefined,
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
    const updatePayload = this.buildRegisterPayload(value);
    this.viewSubmitting = true;

    this.companyApi.updateCompany(this.selectedCompanyId, userIdForUpdate, updatePayload).subscribe({
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
    return this.buildRegisterRequest(value);
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
        next: (res) => {
          this.viewSubmitting = false;
      
          if (res?.publicCompanyId) {
            console.log('Public Company ID:', res.publicCompanyId);
            // localStorage.setItem('public_company_id', res.publicCompanyId);
          }
      
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

  //pulbic id approve
  onApprove(company: CardData): void {
    if (company.id) {
      this.companyApi
        .updateCompanyApprovalStatus(company.id, 'ADMIN', { approvalStatus: 'APPROVED' })
        .subscribe({
          next: (res) => {
            if (res?.publicCompanyId) {
              console.log('Public Company ID:', res.publicCompanyId);
              // optional:
              // localStorage.setItem('public_company_id', res.publicCompanyId);
            }
  
            this.loadCompanies();
          },
        });
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
    // Reset form to empty state
    this.createFormValue = CompanyFormComponent.createEmptyValue();
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.createFormValue = CompanyFormComponent.createEmptyValue();
  }

  handleCreateSubmit(value: CompanyFormValue): void {
    if (this.createSubmitting) {
      return;
    }

    const currentUser = this.auth.getCurrentUser();
    const isAdminRoute = this.router.url.includes('/admin/company');
    
    // On admin route, we only need userId. Otherwise, we need both userId and userType
    if (!currentUser?.userId || (!isAdminRoute && !currentUser.userType)) {
      this.notify.error('Missing auth context. Please sign in and try again.');
      return;
    }

    this.createSubmitting = true;

    const registerPayload = this.buildRegisterPayload(value);

    // Prepare options - include userType as 'ADMIN' if on admin route, otherwise use current user's type
    const options = {
      userId: currentUser.userId,
      ...(isAdminRoute ? { userType: 'ADMIN' as const } : currentUser.userType ? { userType: currentUser.userType } : {}),
    };

    this.companyApi
      .registerCompany(registerPayload, options)
      .subscribe({
        next: (response: CompanyRegistrationResponse | null) => {
          this.createSubmitting = false;
          if (response) {
            this.notify.success('Company created successfully!');
            this.closeCreateModal();
            // Reload companies list
            this.loadCompanies();
          } else {
            this.notify.error('Failed to create company. Please try again.');
          }
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.createSubmitting = false;
          let errorMessage = 'Failed to create company. Please try again.';
          
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

  private buildRegisterPayload(value: CompanyFormValue): CompanyRegisterPayload {
    return {
      request: this.buildRegisterRequest(value),
      files: this.buildRegisterFiles(value),
    };
  }

  private buildRegisterRequest(value: CompanyFormValue): CompanyRegisterRequest {
    return {
      companyName: value.companyName || '',
      companyLogoUrl: this.resolvePhotoValue(value.companyPhoto, value.companyPhotoUrl),
      adminName: value.adminName || '',
      adminDesignation: value.adminDesignation || '',
      adminEmail: value.adminEmail.toLowerCase() || '',
      adminPhone: value.adminPhone || '',
      websiteUrl: value.companyWebsiteUrl || '',
      otherWebsiteUrl: value.otherWebsiteUrl || '',
      registerNumber: value.registerNumber || '',
      keyPeople: value.keyPeople.map((p) => ({
        name: p.name || '',
        designation: p.designation || '',
        photoUrl: this.resolvePhotoValue(p.photo, p.photoUrl),
      })),
      aboutCompany: value.aboutCompany || '',
      companyAddress: value.companyAddress || '',
    };
  }

  private buildRegisterFiles(value: CompanyFormValue): CompanyRegisterFiles {
    const keyPersonPhotos = value.keyPeople.map((person) => person.photo);
    return {
      companyLogo: value.companyPhoto,
      keyPerson1Photo: keyPersonPhotos[0] ?? null,
      keyPerson2Photo: keyPersonPhotos[1] ?? null,
      keyPerson3Photo: keyPersonPhotos[2] ?? null,
    };
  }

  private resolvePhotoValue(file: File | null, existingUrl?: string): string | undefined {
    const fileName = file?.name?.trim();
    if (fileName) {
      return fileName;
    }
    const cleaned = cleanUiText(existingUrl);
    return cleaned || undefined;
  }

  handleCreateCancel(): void {
    this.closeCreateModal();
  }

  get isSelectedCompanyApproved(): boolean {
    const status = toApprovalStatusLabel(this.selectedCompanyApprovalStatus);
    return status === 'APPROVED' || status === 'REJECTED';
  }

  downloadTemplate(): void {
    const headers = [
      'Company Name',
      'Admin Name',
      'Admin Designation',
      'Admin Email',
      'Admin Phone',
      'Company Address',
      'Company Logo URL',
      'Website URL',
      'Other Website URL',
      'Register Number',
      'About Company',
      'Key Person 1 Name',
      'Key Person 1 Designation',
      'Key Person 1 Photo URL',
      'Key Person 2 Name',
      'Key Person 2 Designation',
      'Key Person 2 Photo URL',
      'Key Person 3 Name',
      'Key Person 3 Designation',
      'Key Person 3 Photo URL',
    ];

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([headers]);

    // Set column widths for better readability
    const columnWidths = [
      { wch: 25 }, // Company Name
      { wch: 20 }, // Admin Name
      { wch: 20 }, // Admin Designation
      { wch: 25 }, // Admin Email
      { wch: 15 }, // Admin Phone
      { wch: 30 }, // Company Address
      { wch: 30 }, // Company Logo URL
      { wch: 30 }, // Website URL
      { wch: 30 }, // Other Website URL
      { wch: 18 }, // Register Number
      { wch: 40 }, // About Company
      { wch: 20 }, // Key Person 1 Name
      { wch: 20 }, // Key Person 1 Designation
      { wch: 30 }, // Key Person 1 Photo URL
      { wch: 20 }, // Key Person 2 Name
      { wch: 20 }, // Key Person 2 Designation
      { wch: 30 }, // Key Person 2 Photo URL
      { wch: 20 }, // Key Person 3 Name
      { wch: 20 }, // Key Person 3 Designation
      { wch: 30 }, // Key Person 3 Photo URL
    ];
    worksheet['!cols'] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Company Registration');

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
    link.setAttribute('download', 'company_registration_template.xlsx');
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

    this.uploadBulkCompanies(file);
  }

  private uploadBulkCompanies(file: File): void {
    if (this.uploadingTemplate) {
      return;
    }

    this.uploadingTemplate = true;

    this.companyApi.bulkUploadCompanies(file).subscribe({
      next: (response: BulkUploadResponse | null) => {
        this.uploadingTemplate = false;
        
        if (response) {
          const totalRows = response.totalRows || 0;
          const successfulRows = response.successfulRows || 0;
          const failedRows = response.failedRows || 0;
          
          if (failedRows === 0) {
            this.notify.success(`Bulk upload completed successfully! ${successfulRows} company(ies) uploaded.`);
          } else {
            this.notify.warn(
              `Bulk upload completed with some errors. ${successfulRows} successful, ${failedRows} failed out of ${totalRows} total rows.`
            );
          }
          
          // Reload companies list to show newly uploaded companies
          this.loadCompanies();
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


