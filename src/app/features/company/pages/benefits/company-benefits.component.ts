import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { DropdownComponent, DropdownItem } from '../../../../shared/components/dropdown/dropdown.component';

export interface BenefitsFormValue {
  internToJobRate: string;
  startingSalaryRange: string;
  performanceBonus: string;
  healthcare: string;
  mentorBuddySystem: string;
  workLifeBalance: string;
  appreciationDayOff: string;
  trainingUpskilling: string;
  sickLeaves: string;
  referralBonus: string;
}

@Component({
  selector: 'app-company-benefits',
  standalone: true,
  imports: [CommonModule, ButtonComponent, DropdownComponent],
  templateUrl: './company-benefits.component.html',
  styleUrl: './company-benefits.component.css',
})
export class CompanyBenefitsComponent {
  @Input() submitting = false;
  @Input() value: BenefitsFormValue = {
    internToJobRate: '',
    startingSalaryRange: '',
    performanceBonus: '',
    healthcare: '',
    mentorBuddySystem: '',
    workLifeBalance: '',
    appreciationDayOff: '',
    trainingUpskilling: '',
    sickLeaves: '',
    referralBonus: '',
  };

  @Output() valueChange = new EventEmitter<BenefitsFormValue>();
  @Output() submitted = new EventEmitter<BenefitsFormValue>();

  readonly rateItems: readonly DropdownItem<string>[] = [
    { label: '85%', value: '85%' },
    { label: '90%', value: '90%' },
    { label: '95%', value: '95%' },
    { label: '100%', value: '100%' },
  ];

  readonly salaryItems: readonly DropdownItem<string>[] = [
    { label: '3,000,000', value: '3000000' },
    { label: '4,000,000', value: '4000000' },
    { label: '5,000,000', value: '5000000' },
    { label: '6,000,000', value: '6000000' },
    { label: '7,000,000', value: '7000000' },
  ];

  readonly benefitFields: { key: keyof BenefitsFormValue; label: string }[] = [
    { key: 'performanceBonus', label: 'Performance Bonus' },
    { key: 'healthcare', label: 'Healthcare' },
    { key: 'mentorBuddySystem', label: 'Mentor-Buddy System' },
    { key: 'workLifeBalance', label: 'Work-Life Balance Perks' },
    { key: 'appreciationDayOff', label: 'Appreciation Day Off' },
    { key: 'trainingUpskilling', label: 'Training & Upskilling' },
    { key: 'sickLeaves', label: 'Sick Leaves' },
    { key: 'referralBonus', label: 'New Employee Referral Bonus' },
  ];

  updateField(field: keyof BenefitsFormValue, value: string): void {
    const next = { ...this.value, [field]: value };
    this.value = next;
    this.valueChange.emit(next);
  }

  submit(): void {
    this.submitted.emit(this.value);
  }
}
