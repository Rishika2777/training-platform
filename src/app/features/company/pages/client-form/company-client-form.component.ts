import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { InputComponent } from '../../../../shared/components/input/input.component';

export interface ClientFormValue {
  logo: File | null;
  clientName: string;
}

@Component({
  selector: 'app-company-client-form',
  standalone: true,
  imports: [CommonModule, ButtonComponent, InputComponent],
  templateUrl: './company-client-form.component.html',
  styleUrl: './company-client-form.component.css',
})
export class CompanyClientFormComponent {
  @ViewChild('logoFileInput') logoFileInput!: ElementRef<HTMLInputElement>;

  @Input() submitting = false;
  @Input() value: ClientFormValue = {
    logo: null,
    clientName: '',
  };

  @Output() valueChange = new EventEmitter<ClientFormValue>();
  @Output() submitted = new EventEmitter<ClientFormValue>();

  submitAttempted = false;

  patch(patch: Partial<ClientFormValue>): void {
    const next: ClientFormValue = { ...this.value, ...patch };
    this.value = next;
    this.valueChange.emit(next);
  }

  triggerLogoSelect(): void {
    this.logoFileInput?.nativeElement?.click();
  }

  onLogoSelected(files: FileList | null): void {
    const file = files && files.length > 0 ? files.item(0) : null;
    this.patch({ logo: file });
  }

  get logoName(): string {
    return this.value.logo?.name ?? '';
  }

  submit(): void {
    this.submitAttempted = true;
    if (this.isFormValid()) {
      this.submitted.emit(this.value);
    }
  }

  isFormValid(): boolean {
    return this.value.logo !== null && this.value.clientName.trim().length > 0;
  }

  onFormSubmit(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.submit();
  }

  onButtonClick(event?: MouseEvent): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.submit();
  }
}

