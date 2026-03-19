import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, inject } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { NotificationService } from '../../../../core/notifications/notification.service';

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
  private readonly notify = inject(NotificationService);
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

  downloadTemplate(): void {
    const link = document.createElement('a');
    link.href = 'assets/Resume_Template.docx';
    link.download = 'Resume_Template.docx';
    link.rel = 'noopener';
    link.click();
    this.notify.success('Downloading template...');
  }

  get fileName(): string {
    return this.value.resumeFile?.name ?? '';
  }

  get hasFile(): boolean {
    return this.value.resumeFile !== null;
  }

  /** Returns the Font Awesome icon class for the uploaded file type (PDF, DOC/DOCX, or generic). */
  get fileIconClass(): string {
    const name = this.value.resumeFile?.name?.toLowerCase() ?? '';
    if (name.endsWith('.pdf')) return 'fa-solid fa-file-pdf';
    if (name.endsWith('.doc') || name.endsWith('.docx')) return 'fa-solid fa-file-word';
    return 'fa-solid fa-file-lines';
  }

  /** Returns a modifier class for file-type-specific icon color (pdf=red, word=blue, default=gray). */
  get fileIconColorClass(): string {
    const name = this.value.resumeFile?.name?.toLowerCase() ?? '';
    if (name.endsWith('.pdf')) return 'file-icon--pdf';
    if (name.endsWith('.doc') || name.endsWith('.docx')) return 'file-icon--word';
    return 'file-icon--default';
  }
}

