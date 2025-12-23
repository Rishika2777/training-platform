import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';

export interface ResumeUploadFormValue {
  resumeFile: File | null;
}

@Component({
  selector: 'app-student-resume-upload',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './student-resume-upload.component.html',
  styleUrl: './student-resume-upload.component.css',
})
export class StudentResumeUploadComponent {
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  @Input() submitting = false;
  @Input() value: ResumeUploadFormValue = {
    resumeFile: null,
  };

  @Output() valueChange = new EventEmitter<ResumeUploadFormValue>();
  @Output() submitted = new EventEmitter<ResumeUploadFormValue>();

  isDragging = false;

  triggerFileSelect(): void {
    if (this.fileInputRef?.nativeElement && !this.submitting) {
      this.fileInputRef.nativeElement.click();
    }
  }

  onFileSelected(event: Event): void {
    const files = (event.target as HTMLInputElement)?.files;
    if (files && files.length > 0) {
      const file = files[0];
      this.patch({ resumeFile: file });
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
      this.patch({ resumeFile: file });
    }
  }

  patch(patch: Partial<ResumeUploadFormValue>): void {
    const next: ResumeUploadFormValue = { ...this.value, ...patch };
    this.value = next;
    this.valueChange.emit(next);
  }

  submit(): void {
    if (this.hasFile) {
      this.submitted.emit(this.value);
    }
  }

  get fileName(): string {
    return this.value.resumeFile?.name ?? '';
  }

  get hasFile(): boolean {
    return this.value.resumeFile !== null;
  }
}

