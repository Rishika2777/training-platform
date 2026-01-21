import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, QueryList, ViewChildren } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { TechnologyResponse } from '../../services/company-api.service';

export interface TechnologyItem {
  technologyName: string;
  description: string;
  icon: File | null;
}

export interface SpecializationFormValue {
  technologies: TechnologyItem[];
}

@Component({
  selector: 'app-company-specialization',
  standalone: true,
  imports: [CommonModule, ButtonComponent, InputComponent],
  templateUrl: './company-specialization.component.html',
  styleUrl: './company-specialization.component.css',
})
export class CompanySpecializationComponent {
  @ViewChildren('iconFileInput') iconFileInputs!: QueryList<ElementRef<HTMLInputElement>>;

  @Input() submitting = false;
  @Input() value: SpecializationFormValue = {
    technologies: [{ technologyName: '', description: '', icon: null }],
  };
  @Input() specializations: readonly TechnologyResponse[] = [];

  @Output() valueChange = new EventEmitter<SpecializationFormValue>();
  @Output() submitted = new EventEmitter<SpecializationFormValue>();
  @Output() deleteRequested = new EventEmitter<string>();

  submitAttempted = false;
  deletingTechnologyId: string | null = null;

  /**
   * Reset form to initial empty state
   * Called after successful submission
   */
  resetForm(): void {
    console.log('CompanySpecializationComponent: resetForm() called - Resetting form');
    this.value = {
      technologies: [{ technologyName: '', description: '', icon: null }],
    };
    this.submitAttempted = false;
    
    // Clear all file inputs
    this.iconFileInputs.forEach((inputRef) => {
      if (inputRef?.nativeElement) {
        inputRef.nativeElement.value = '';
      }
    });
    
    // Emit the reset value to parent
    this.valueChange.emit(this.value);
  }

  addTechnology(): void {
    const next = { 
      ...this.value, 
      technologies: [...this.value.technologies, { technologyName: '', description: '', icon: null }] 
    };
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

  updateTechnologyName(index: number, value: string): void {
    const technologies = [...this.value.technologies];
    technologies[index] = { ...technologies[index], technologyName: value };
    const next = { ...this.value, technologies };
    this.value = next;
    this.valueChange.emit(next);
  }

  updateTechnologyDescription(index: number, value: string): void {
    const technologies = [...this.value.technologies];
    technologies[index] = { ...technologies[index], description: value };
    const next = { ...this.value, technologies };
    this.value = next;
    this.valueChange.emit(next);
  }

  onIconSelected(index: number, files: FileList | null): void {
    const file = files && files.length > 0 ? files.item(0) : null;
    const technologies = [...this.value.technologies];
    technologies[index] = { ...technologies[index], icon: file };
    const next = { ...this.value, technologies };
    this.value = next;
    this.valueChange.emit(next);
  }

  triggerIconSelect(index: number, fileInput: HTMLInputElement | undefined): void {
    if (fileInput) {
      fileInput.click();
    } else {
      const inputs = this.iconFileInputs.toArray();
      if (inputs[index]) {
        inputs[index].nativeElement.click();
      }
    }
  }

  getIconName(index: number): string {
    return this.value.technologies[index]?.icon?.name ?? '';
  }

  getSpecializationIconUrl(iconUrl: string | undefined | null): string | null {
    if (!iconUrl) return null;
    if (iconUrl.startsWith('http://') || iconUrl.startsWith('https://')) {
      return iconUrl;
    }
    return `/api/v1/files/${iconUrl}`;
  }

  onDeleteTechnology(technologyId: string | undefined): void {
    if (!technologyId) {
      console.warn('CompanySpecializationComponent: Cannot delete technology without ID');
      return;
    }
    console.log('CompanySpecializationComponent: Delete requested for technology:', technologyId);
    this.deleteRequested.emit(technologyId);
  }

  isDeleting(technologyId: string | undefined): boolean {
    return this.deletingTechnologyId === technologyId;
  }

  isTechnologyValid(tech: TechnologyItem): boolean {
    return tech.technologyName.trim().length > 0 && 
           tech.description.trim().length > 0 && 
           tech.icon !== null;
  }

  isFormValid(): boolean {
    return this.value.technologies.some((t) => this.isTechnologyValid(t));
  }

  onFormSubmit(event: Event | MouseEvent): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    console.log('CompanySpecializationComponent: onFormSubmit() called, preventing default');
    this.submit();
  }

  onButtonClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    console.log('CompanySpecializationComponent: onButtonClick() called');
    this.submit();
  }

  submit(): void {
    console.log('CompanySpecializationComponent: submit() called');
    this.submitAttempted = true;
    const filtered = {
      ...this.value,
      technologies: this.value.technologies.filter((t) => this.isTechnologyValid(t)),
    };
    console.log('CompanySpecializationComponent: Filtered technologies:', filtered.technologies.length);
    if (filtered.technologies.length > 0) {
      console.log('CompanySpecializationComponent: Emitting submitted event');
      this.submitted.emit(filtered);
    } else {
      console.warn('CompanySpecializationComponent: No valid technologies to submit');
    }
  }
}











