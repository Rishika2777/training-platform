import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { DropdownComponent, DropdownItem } from '../../../../shared/components/dropdown/dropdown.component';

export interface VisionPerformanceFormValue {
  vision: string;
  metrics: {
    name: string;
    value: string;
    year: string;
  }[];
}

@Component({
  selector: 'app-company-vision-performance',
  standalone: true,
  imports: [CommonModule, ButtonComponent, DropdownComponent],
  templateUrl: './company-vision-performance.component.html',
  styleUrl: './company-vision-performance.component.css',
})
export class CompanyVisionPerformanceComponent {
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

  @Output() valueChange = new EventEmitter<VisionPerformanceFormValue>();
  @Output() submitted = new EventEmitter<VisionPerformanceFormValue>();

  readonly metricNameItems: readonly DropdownItem<string>[] = [
    { label: 'Customer Satisfaction Rate', value: 'customer-satisfaction' },
    { label: 'Employee Retention Rate', value: 'employee-retention' },
    { label: 'Revenue Growth', value: 'revenue-growth' },
    { label: 'Other', value: 'other' },
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

  updateVision(value: string): void {
    const next = { ...this.value, vision: value };
    this.value = next;
    this.valueChange.emit(next);
  }

  updateMetric(index: number, field: 'name' | 'value' | 'year', value: string): void {
    const metrics = [...this.value.metrics];
    metrics[index] = { ...metrics[index], [field]: value };
    const next = { ...this.value, metrics };
    this.value = next;
    this.valueChange.emit(next);
  }

  submit(): void {
    this.submitted.emit(this.value);
  }
}
