import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, inject, Input, Output, signal, ViewChild } from '@angular/core';
import { Observable, map, catchError, of } from 'rxjs';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { DropdownComponent, ApiFetchFunction, DropdownItem } from '../../../../shared/components/dropdown/dropdown.component';
import { CampusApiService } from '../../services/campus-api.service';

export interface CompaniesVisitedFormValue {
  companyLogo: File | null;
  companyName: string;
}

@Component({
  selector: 'app-campus-companies-visited',
  standalone: true,
  imports: [CommonModule, ButtonComponent, InputComponent, DropdownComponent],
  templateUrl: './campus-companies-visited.component.html',
  styleUrl: './campus-companies-visited.component.css',
})
export class CampusCompaniesVisitedComponent {
  private readonly campusApi = inject(CampusApiService);

  @ViewChild('companyLogoFileInput') companyLogoFileInput!: ElementRef<HTMLInputElement>;

  @Input() submitting = false;
  @Input() value: CompaniesVisitedFormValue = {
    companyLogo: null,
    companyName: '',
  };

  @Output() valueChange = new EventEmitter<CompaniesVisitedFormValue>();
  @Output() submitted = new EventEmitter<CompaniesVisitedFormValue>();

  submitAttempted = false;

  // Company name items - loaded via API autocomplete
  // Using API fetch function for real-time search from registered companies
  loadingCompanyNames = signal(false);

  /**
   * API fetch function for company names autocomplete
   * Fetches companies by search term
   * GET /company/getCompanyBySearch?searchTerm={searchTerm}&page=0&size=20
   * 
   * Behavior:
   * - If search is empty: Returns first 20 companies
   * - If search has characters: Searches by companyName (case-insensitive partial match)
   * - Returns companyId, companyName, and companyAddress
   */
  fetchCompanyNames: ApiFetchFunction = (searchTerm: string): Observable<DropdownItem[]> => {
    this.loadingCompanyNames.set(true);
    
    return this.campusApi.getCompanyBySearch(searchTerm).pipe(
      map((response) => {
        if (response?.success && response.data && Array.isArray(response.data)) {
          // Convert company objects to dropdown items
          const dropdownItems: DropdownItem[] = response.data
            .filter(company => {
              // Filter out companies without a name
              return company.companyName && company.companyName.trim().length > 0;
            })
            .map(company => {
              const companyName = company.companyName.trim();
              
              // Use companyName as both label and value
              return {
                label: companyName,
                value: companyName,
              };
            })
            // Remove duplicates (in case of duplicate names)
            .filter((item, index, self) => 
              index === self.findIndex((t) => t.value.toLowerCase() === item.value.toLowerCase())
            );
          
          this.loadingCompanyNames.set(false);
          return dropdownItems;
        }
        
        this.loadingCompanyNames.set(false);
        return [];
      }),
      catchError((error) => {
        console.error('Error fetching companies:', error);
        this.loadingCompanyNames.set(false);
        return of([]);
      })
    );
  };

  /**
   * Reset form to initial empty state
   * Called when modal opens or after successful submission
   */
  resetForm(): void {
    this.value = {
      companyLogo: null,
      companyName: '',
    };
    this.submitAttempted = false;
    // Clear file input
    if (this.companyLogoFileInput?.nativeElement) {
      this.companyLogoFileInput.nativeElement.value = '';
    }
    this.valueChange.emit(this.value);
  }

  patch(patch: Partial<CompaniesVisitedFormValue>): void {
    const next: CompaniesVisitedFormValue = { ...this.value, ...patch };
    this.value = next;
    this.valueChange.emit(next);
  }

  triggerCompanyLogoSelect(): void {
    this.companyLogoFileInput?.nativeElement?.click();
  }

  onCompanyLogoSelected(files: FileList | null): void {
    const file = files && files.length > 0 ? files.item(0) : null;
    this.patch({ companyLogo: file });
  }

  get companyLogoName(): string {
    return this.value.companyLogo?.name ?? '';
  }

  submit(): void {
    this.submitAttempted = true;
    if (this.isFormValid()) {
      this.submitted.emit(this.value);
    }
  }

  isFormValid(): boolean {
    return this.value.companyLogo !== null && this.value.companyName.trim().length > 0;
  }

  onFormSubmit(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.submit();
  }

  onButtonClick(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.submit();
  }
}

