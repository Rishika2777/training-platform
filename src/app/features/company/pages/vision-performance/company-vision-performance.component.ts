import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { CompanyApiService } from '../../services/company-api.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { DropdownComponent, DropdownItem } from '../../../../shared/components/dropdown/dropdown.component';

/* =======================
   Interfaces
======================= */

export interface VisionMetric {
  name: string;
  value: string;
  year: string;
}

export interface VisionPerformanceFormValue {
  vision: string;
  metrics: VisionMetric[];
}

export interface VisionRequest {
  vision: string;
  metricName: string;
  value: string;
  year: string;
}

export interface VisionResponse {
  success: boolean;
  message: string;
  data: unknown;
  statusCode: number;
  timestamp: string;
}

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

  /* ---------- Inputs ---------- */
  @Input() companyId = '';
  @Input() submitting = false;

  @Input() value: VisionPerformanceFormValue = {
    vision: '',
    metrics: [
      {
        name: '',
        value: '',
        year: '',
      },
    ],
  };

  /* ---------- Outputs ---------- */
  @Output() valueChange = new EventEmitter<VisionPerformanceFormValue>();
  @Output() submitted = new EventEmitter<VisionPerformanceFormValue>();

  /* ---------- UI State ---------- */
  loading = false;
  responseMessage = '';

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

  readonly yearItems: readonly DropdownItem<string>[] = [
    { label: '2024', value: '2024' },
    { label: '2023', value: '2023' },
    { label: '2022', value: '2022' },
    { label: '2021', value: '2021' },
  ];

  private readonly companyApi = inject(CompanyApiService);

  /* =======================
     Form Updates
  ======================= */

  updateVision(vision: string): void {
    const next = { ...this.value, vision };
    this.value = next;
    this.valueChange.emit(next);
  }

  updateMetric(
    index: number,
    field: 'name' | 'value' | 'year',
    value: string
  ): void {
    const metrics = [...this.value.metrics];
    metrics[index] = { ...metrics[index], [field]: value };

    const next = { ...this.value, metrics };
    this.value = next;
    this.valueChange.emit(next);
  }

  /* =======================
     Submit
  ======================= */

  submit(): void {
  if (this.loading) {
    return;
  }

  console.log('CompanyVisionPerformanceComponent submit() called');

  if (!this.companyId) {
    this.responseMessage = 'Company ID is required';
    return;
  }

    if (!this.value.vision) {
      this.responseMessage = 'Company vision is required';
      return;
    }

    const hasInvalidMetric = this.value.metrics.some(
      m => !m.name || !m.value || !m.year
    );

    if (hasInvalidMetric) {
      this.responseMessage = 'Please fill all metric fields';
      return;
    }

    this.loading = true;
    this.responseMessage = '';

  const requests = this.value.metrics.map(metric =>
  this.companyApi.addVisionPerformance(this.companyId, {
    vision: this.value.vision,
    metricName: metric.name,
    value: metric.value,
    year: metric.year,
  })
);


    forkJoin(requests).subscribe({
      next: () => {
        this.responseMessage = 'Vision & Achievements submitted successfully!';
        this.loading = false;
        this.submitted.emit(this.value);
      },
      error: error => {
        console.error(error);
        this.responseMessage = 'Error submitting vision. Please try again!';
        this.loading = false;
      },
    });
  }
    /* =======================
     Fix Template Errors
  ======================= */
  onFormSubmit(event: Event): void {
    event.preventDefault(); // Prevent default HTML form submit
    this.submit();
  }

  onButtonClick(): void {
    this.submit();
  }
}


