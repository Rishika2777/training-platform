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
  workLifeBalancePerks: string;        // renamed
  appreciationDayOff: string;
  trainingAndUpskilling: string;       // renamed
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
    workLifeBalancePerks: '',
    appreciationDayOff: '',
    trainingAndUpskilling: '',
    sickLeaves: '',
    referralBonus: '',
  };

  @Output() valueChange = new EventEmitter<BenefitsFormValue>();
  @Output() submitted = new EventEmitter<BenefitsFormValue>();

  readonly rateItems: readonly DropdownItem<string>[] = [
    { label: '70%', value: '70%' },
    { label: '75%', value: '75%' },
    { label: '80%', value: '80%' },
    { label: '85%', value: '85%' },
    { label: '90%', value: '90%' },
    { label: '95%', value: '95%' },
    { label: '100%', value: '100%' },
  ];

  readonly salaryItems: readonly DropdownItem<string>[] = [
    { label: '₹30,000 - ₹50,000 INR', value: '30000-50000' },
    { label: '₹50,000 - ₹80,000 INR', value: '50000-80000' },
    { label: '₹80,000 - ₹1,00,000 INR', value: '80000-100000' },
    { label: '₹1,00,000 - ₹1,50,000 INR', value: '100000-150000' },
    { label: '₹1,50,000 - ₹2,00,000 INR', value: '150000-200000' },
  ];
  
readonly benefitFields: { key: keyof BenefitsFormValue; label: string }[] = [
  { key: 'performanceBonus', label: 'Performance Bonus' },
  { key: 'healthcare', label: 'Healthcare' },
  { key: 'mentorBuddySystem', label: 'Mentor-Buddy System' },
  { key: 'workLifeBalancePerks', label: 'Work-Life Balance Perks' },
  { key: 'appreciationDayOff', label: 'Appreciation Day Off' },
  { key: 'trainingAndUpskilling', label: 'Training & Upskilling' },
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

  onButtonClick(event?: MouseEvent): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.submit();
  }
}
