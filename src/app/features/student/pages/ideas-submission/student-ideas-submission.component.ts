import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, inject } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { StudentApiService } from '../../services/student-api.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { catchError, of } from 'rxjs';

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
  private readonly studentApi = inject(StudentApiService);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  @Input() submitting = false;
  @Input() value: IdeasSubmissionFormValue = {
    documentFile: null,
    description: '',
  };

  @Output() valueChange = new EventEmitter<IdeasSubmissionFormValue>();
  @Output() submitted = new EventEmitter<IdeasSubmissionFormValue>();

  submittingInternal = false;
  downloadingInternal = false;
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
    if (!this.isFormValid() || this.submittingInternal) {
      return;
    }

    const studentId = this.auth.getCurrentUser()?.studentId?.toString();
    if (!studentId) {
      this.notify.error('Student ID not found');
      return;
    }

    // Backend expects a URL; until upload API is added, we send the selected filename.
    const documentUrl = this.value.documentFile?.name ?? '';
    const description = this.value.description.trim();

    this.submittingInternal = true;

    this.studentApi
      .submitIdea(studentId, { documentUrl, description })
      .pipe(
        catchError((error) => {
          this.submittingInternal = false;
          this.notify.error(error?.message || 'Failed to submit idea');
          return of(null);
        }),
      )
      .subscribe((resp) => {
        this.submittingInternal = false;
        if (resp?.success) {
          this.notify.success(resp.message || 'Idea submitted successfully.');
          this.submitted.emit(this.value);
        } else if (resp) {
          this.notify.error(resp.message || 'Failed to submit idea');
        }
      });
  }

  downloadTemplate(): void {
    if (this.downloadingInternal || this.submittingInternal) {
      return;
    }

    const studentId = this.auth.getCurrentUser()?.studentId?.toString();
    if (!studentId) {
      this.notify.error('Student ID not found');
      return;
    }

    this.downloadingInternal = true;

    this.studentApi
      .getIdeaTemplateInfo(studentId)
      .pipe(
        catchError((error) => {
          this.downloadingInternal = false;
          this.notify.error(error?.message || 'Failed to get template info');
          return of(null);
        }),
      )
      .subscribe((resp) => {
        this.downloadingInternal = false;
        if (resp?.success && resp.data) {
          // If backend returns a URL, open it. Otherwise still try to open as-is.
          window.open(resp.data, '_blank');
          this.notify.success(resp.message || 'Downloading template...');
        } else if (resp) {
          this.notify.error(resp.message || 'Failed to download template');
        }
      });
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

