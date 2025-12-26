import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { CardComponent, CardData } from '../../../../shared/components/card/card.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { AdminApiService } from '../../services/admin-api.service';
import { CompanyApiService, CompanyRegistrationResponse } from '../../../company/services/company-api.service';
import {
  CompanyFormComponent,
  CompanyFormValue,
} from '../../../../shared/components/forms/company-form/company-form.component';
import { EnumLoginStatus } from '../../../../core/config/app.constants';

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
  readonly announcementDate = 'January 7th, 2025';

  companies: CardData[] = [];
  displayedCompanies: CardData[] = [];
  isLoading = false;

  showDeleteModal = false;
  selectedCompany: CardData | null = null;

  showViewModal = false;
  viewSubmitting = false;
  selectedCompanyId: string | null = null;
  selectedCompanyApprovalStatus: string | null = null;
  viewValue: CompanyFormValue = CompanyFormComponent.createEmptyValue();

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
                name: company.companyName ?? company.email?.split('@')[0] ?? 'Company Name',
                imageUrl: company.companyLogoUrl ?? 'assets/images/landing-card-company.png',
                secondaryInfo: `Approval: ${toApprovalStatusLabel(company.approvalStatus)}`,
                email: company.email ?? company.adminEmail ?? '',
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
    this.selectedCompanyApprovalStatus = null;
    this.viewValue = CompanyFormComponent.createEmptyValue();
  }

  handleReviewAction(status: EnumLoginStatus): void {
    if (!this.selectedCompanyId) {
      return;
    }
    if (status !== 'APPROVED' && status !== 'REJECTED') {
      return;
    }
    if (status === 'REJECTED' && !confirm('Are you sure you want to reject this company?')) {
      return;
    }

    this.viewSubmitting = true;
    this.companyApi
      .updateCompanyApprovalStatus(this.selectedCompanyId, 'ADMIN', { approvalStatus: status })
      .subscribe({
        next: () => {
          this.viewSubmitting = false;
          this.closeViewModal();
          this.loadCompanies();
        },
        error: () => {
          this.viewSubmitting = false;
        },
      });
  }

  onDelete(company: CardData): void {
    this.selectedCompany = company;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (this.selectedCompany?.userId) {
      this.adminApi.deleteUser(this.selectedCompany.userId).subscribe({
        next: () => {
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
      // Uploads not wired here; keep null.
      companyPhoto: null,
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
    return isApprovedStatus(this.selectedCompanyApprovalStatus);
  }
}

function isApprovedStatus(status: string | null | undefined): boolean {
  return toApprovalStatusLabel(status) === 'APPROVED';
}

function toApprovalStatusLabel(status: string | null | undefined): string {
  const cleaned = (status ?? '').trim();
  if (!cleaned) {
    return 'PENDING_APPROVAL';
  }
  if (cleaned === 'PENDING') {
    return 'PENDING_APPROVAL';
  }
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


