import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { forkJoin } from 'rxjs';
import { CompanyApiService } from '../../services/company-api.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { DropdownComponent, DropdownItem } from '../../../../shared/components/dropdown/dropdown.component';
import { AuthStateService } from '../../../../core/auth/auth-state.service';
import { StorageService } from '../../../../core/storage/storage.service';
import { STORAGE_KEYS } from '../../../../core/config/app.constants';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { VisionPerformanceFormValue } from './company-vision-performance.models';

/* =======================
   Component
======================= */

@Component({
  selector: 'app-company-vision-performance',
  standalone: true,
  imports: [CommonModule, ButtonComponent, DropdownComponent],
  templateUrl: './company-vision-performance.component.html',
  styleUrls: ['./company-vision-performance.component.css'],
})
export class CompanyVisionPerformanceComponent {
  private readonly companyApi = inject(CompanyApiService);
  private readonly authState = inject(AuthStateService);
  private readonly storage = inject(StorageService);
  private readonly notify = inject(NotificationService);
  readonly MIN_VISION_LENGTH = 20;
readonly MAX_VISION_LENGTH = 500;

visionCharCount = 0;


  /* ---------- Form State ---------- */
  value: VisionPerformanceFormValue = {
    vision: '',
    metrics: [
      {
        name: '',
        value: '',
        year: '',
      },
    ],
  };

  /* ---------- Validation State ---------- */
  visionInvalid = false;
  metricInvalidations: boolean[] = [false];

  /* ---------- UI State ---------- */
  loading = false;

  /* ---------- Dropdown Data ---------- */
  readonly metricNameItems: readonly DropdownItem<string>[] = [
    { label: 'Customer Satisfaction Rate', value: 'Customer Satisfaction Rate' },
    { label: 'Employee Retention Rate', value: 'Employee Retention Rate' },
    { label: 'Revenue Growth', value: 'Revenue Growth' },
    { label: 'Other', value: 'Other' },
  ];

  readonly valueItems: readonly DropdownItem<string>[] = [
    { label: '99%', value: '99%' },
    { label: '95%', value: '95%' },
    { label: '90%', value: '90%' },
    { label: '85%', value: '85%' },
    { label: '80%', value: '80%' },
  ];

  /** Year options: current year and 5 years back (6 years total) */
  readonly yearItems: readonly DropdownItem<string>[] = (() => {
    const currentYear = new Date().getFullYear();
    const years: DropdownItem<string>[] = [];
    for (let y = currentYear; y >= currentYear - 5; y--) {
      years.push({ label: y.toString(), value: y.toString() });
    }
    return years;
  })();

  private getCompanyId(): string | null {
    const currentUser = this.authState.user();
    const companyIdFromUser = currentUser?.companyId;
    if (companyIdFromUser) {
      this.storage.set(STORAGE_KEYS.COMPANY_ID, companyIdFromUser);
      return companyIdFromUser;
    }
    
    const companyIdFromStorage = this.storage.get(STORAGE_KEYS.COMPANY_ID) as string | null;
    if (companyIdFromStorage) {
      return companyIdFromStorage;
    }
    
    if (currentUser?.userType === 'COMPANY' && currentUser?.profileServiceId) {
      this.storage.set(STORAGE_KEYS.COMPANY_ID, currentUser.profileServiceId);
      return currentUser.profileServiceId;
    }
    
    return null;
  }

  /* =======================
     Form Updates
  ======================= */

updateVision(vision: string): void {
  this.value = { ...this.value, vision };
  
}




  updateMetric(
    index: number,
    field: 'name' | 'value' | 'year',
    value: string
  ): void {
    const metrics = [...this.value.metrics];
    metrics[index] = { ...metrics[index], [field]: value };
    this.value = { ...this.value, metrics };
    
    // Clear validation for this metric
    if (this.metricInvalidations[index]) {
      this.metricInvalidations[index] = false;
    }
  }


  /* =======================
     Validation
  ======================= */

private validateForm(): boolean {
  let isValid = true;

  const vision = this.value.vision?.trim() || '';

  if (vision.length < this.MIN_VISION_LENGTH) {
    this.visionInvalid = true;
    isValid = false;
  } else {
    this.visionInvalid = false;
  }

  this.metricInvalidations = this.value.metrics.map((metric) => {
    const isInvalid = !metric.name || !metric.value || !metric.year;
    if (isInvalid) {
      isValid = false;
    }
    return isInvalid;
  });

  return isValid;
}


  /* =======================
     Form Reset
  ======================= */

  private resetForm(): void {
    this.value = {
      vision: '',
      metrics: [
        {
          name: '',
          value: '',
          year: '',
        },
      ],
    };
    this.visionInvalid = false;
    this.metricInvalidations = [false];
  }

  /* =======================
     Submit
  ======================= */

  submit(): void {
    if (this.loading) {
      return;
    }

    // Validate form
    if (!this.validateForm()) {
      this.notify.error('Please fill all required fields');
      return;
    }

    const companyId = this.getCompanyId();
    if (!companyId) {
      this.notify.error('Company ID is required');
      return;
    }

    this.loading = true;

    const requests = this.value.metrics.map(metric =>
      this.companyApi.addVisionPerformance(companyId, {
        vision: this.value.vision,
        metricName: metric.name,
        value: metric.value,
        year: metric.year,
      })
    );

    forkJoin(requests).subscribe({
      next: () => {
        this.notify.success('Vision & Achievements submitted successfully!');
        this.loading = false;
      },
      error: (error) => {
        console.error(error);
        this.loading = false;
        this.notify.error('Error submitting vision. Please try again!');
      },
    });
  }

  onFormSubmit(event: Event): void {
    event.preventDefault();
    this.submit();
  }

  onButtonClick(): void {
    this.submit();
  }
}


