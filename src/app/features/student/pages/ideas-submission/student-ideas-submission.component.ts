import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';

export interface IdeasSubmissionFormValue {
  documentFile: File | null;
  description: string;
}

@Component({
  selector: 'app-student-ideas-submission',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './student-ideas-submission.component.html',
  styleUrl: './student-ideas-submission.component.css',
})
export class StudentIdeasSubmissionComponent {
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  @Input() submitting = false;
  @Input() value: IdeasSubmissionFormValue = {
    documentFile: null,
    description: '',
  };

  @Output() valueChange = new EventEmitter<IdeasSubmissionFormValue>();
  @Output() submitted = new EventEmitter<IdeasSubmissionFormValue>();

  isDragging = false;
  readonly maxDescriptionLength = 100;

  triggerFileSelect(): void {
    if (this.fileInputRef?.nativeElement && !this.submitting) {
      this.fileInputRef.nativeElement.click();
    }
  }

  onFileSelected(event: Event): void {
    const files = (event.target as HTMLInputElement)?.files;
    if (files && files.length > 0) {
      const file = files[0];
      this.patch({ documentFile: file });
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.submitting) {
      this.isDragging = true;
    }
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    if (this.submitting) {
      return;
    }

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      this.patch({ documentFile: file });
    }
  }

  onDescriptionChange(value: string): void {
    if (value.length <= this.maxDescriptionLength) {
      this.patch({ description: value });
    }
  }

  patch(patch: Partial<IdeasSubmissionFormValue>): void {
    const next: IdeasSubmissionFormValue = { ...this.value, ...patch };
    this.value = next;
    this.valueChange.emit(next);
  }

  submit(): void {
    if (this.isFormValid()) {
      this.submitted.emit(this.value);
    }
  }

  downloadTemplate(): void {
    // TODO: Implement template download
  }

  get fileName(): string {
    return this.value.documentFile?.name ?? '';
  }

  get hasFile(): boolean {
    return this.value.documentFile !== null;
  }

  get descriptionLength(): number {
    return this.value.description.length;
  }

  get remainingCharacters(): number {
    return this.maxDescriptionLength - this.descriptionLength;
  }

  isFormValid(): boolean {
    return this.value.documentFile !== null && this.value.description.trim().length > 0;
  }
}

