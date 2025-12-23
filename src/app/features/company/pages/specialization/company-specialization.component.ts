import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { InputComponent } from '../../../../shared/components/input/input.component';

export interface SpecializationFormValue {
  technologies: string[];
}

@Component({
  selector: 'app-company-specialization',
  standalone: true,
  imports: [CommonModule, ButtonComponent, InputComponent],
  templateUrl: './company-specialization.component.html',
  styleUrl: './company-specialization.component.css',
})
export class CompanySpecializationComponent {
  @Input() submitting = false;
  @Input() value: SpecializationFormValue = {
    technologies: [''],
  };

  @Output() valueChange = new EventEmitter<SpecializationFormValue>();
  @Output() submitted = new EventEmitter<SpecializationFormValue>();

  addTechnology(): void {
    const next = { ...this.value, technologies: [...this.value.technologies, ''] };
    this.value = next;
    this.valueChange.emit(next);
  }

  removeTechnology(index: number): void {
    if (this.value.technologies.length > 1) {
      const technologies = this.value.technologies.filter((_, i) => i !== index);
      const next = { ...this.value, technologies };
      this.value = next;
      this.valueChange.emit(next);
    }
  }

  updateTechnology(index: number, value: string): void {
    const technologies = [...this.value.technologies];
    technologies[index] = value;
    const next = { ...this.value, technologies };
    this.value = next;
    this.valueChange.emit(next);
  }

  submit(): void {
    const filtered = {
      ...this.value,
      technologies: this.value.technologies.filter((t) => t.trim().length > 0),
    };
    this.submitted.emit(filtered);
  }
}
