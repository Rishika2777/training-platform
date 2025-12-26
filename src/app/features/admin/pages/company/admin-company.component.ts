import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { CardComponent, CardData } from '../../../../shared/components/card/card.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { AdminApiService } from '../../services/admin-api.service';
import { CompanyApiService, CompanyRegistrationResponse } from '../../../company/services/company-api.service';

@Component({
  selector: 'app-admin-company',
  standalone: true,
  imports: [CommonModule, CardComponent, PaginationComponent, ModalComponent, ButtonComponent],
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
    if (company.userId) {
      this.adminApi.getUserById(company.userId).subscribe();
    }
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
      this.adminApi
        .approveCompany(company.id, { status: 'APPROVED', comment: 'Approved by admin' })
        .subscribe({
          next: () => {
            this.loadCompanies();
          },
        });
    }
  }

  onReject(company: CardData): void {
    if (company.id && confirm('Are you sure you want to reject this company?')) {
      this.adminApi
        .approveCompany(company.id, { status: 'REJECTED', comment: 'Rejected by admin' })
        .subscribe({
          next: () => {
            this.loadCompanies();
          },
        });
    }
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updateDisplayedCompanies();
  }

  onAdd(): void {
    // Add company functionality
  }
}


