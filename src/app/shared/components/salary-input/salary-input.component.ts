import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { parseSalary, formatSalary, type SalaryUnit } from '../../utils/salary.utils';

@Component({
  selector: 'app-salary-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './salary-input.component.html',
  styleUrl: './salary-input.component.css',
})
export class SalaryInputComponent implements OnChanges {
  @Input() label = 'Salary';
  @Input() value = '';
  @Input() disabled = false;
  @Input() required = false;
  @Input() invalid = false;
  @Input() placeholder = 'e.g. 5, 8, 12';

  @Output() valueChange = new EventEmitter<string>();

  amount = '';
  unit: SalaryUnit = 'LPA';

  readonly unitOptions: { label: string; value: SalaryUnit }[] = [
    { label: 'LPA (Lakhs)', value: 'LPA' },
    { label: 'K (Thousands)', value: 'K' },
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.parseValue(this.value);
    }
  }

  private parseValue(v: string): void {
    const parsed = parseSalary(v);
    if (parsed) {
      this.amount = String(parsed.amount);
      this.unit = parsed.unit;
    } else if (!v || v.trim() === '') {
      this.amount = '';
      this.unit = 'LPA';
    }
  }

  onAmountChange(val: string): void {
    this.amount = val;
    this.emitValue();
  }

  onUnitChange(unit: SalaryUnit): void {
    this.unit = unit;
    this.emitValue();
  }

  private emitValue(): void {
    const amt = this.amount.trim();
    if (!amt) {
      this.valueChange.emit('');
      return;
    }
    const num = parseFloat(amt);
    if (isNaN(num)) {
      this.valueChange.emit('');
      return;
    }
    this.valueChange.emit(formatSalary(num, this.unit));
  }
}
