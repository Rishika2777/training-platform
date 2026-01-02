import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { InputWithFileComponent } from '../../../../shared/components/input-with-file/input-with-file.component';
import { DropdownComponent } from '../../../../shared/components/dropdown/dropdown.component';

export interface ProspectusUploadFormValue {
  campus: string;
  campusFile: File | null;
  course: string;
  courseFile: File | null;
}

@Component({
  selector: 'app-campus-prospectus',
  standalone: true,
  imports: [CommonModule, ButtonComponent, InputWithFileComponent, DropdownComponent],
  templateUrl: './campus-prospectus.component.html',
  styleUrl: './campus-prospectus.component.css',
})
export class CampusProspectusComponent {

  @Input() submitting = false;
  @Input() value: ProspectusUploadFormValue = {
    campus: '',
    campusFile: null,
    course: '',
    courseFile: null,
  };

  @Output() valueChange = new EventEmitter<ProspectusUploadFormValue>();
  @Output() submitted = new EventEmitter<ProspectusUploadFormValue>();

  readonly courseItems = [
    { label: 'Course 1', value: 'course1' },
    { label: 'Course 2', value: 'course2' },
    { label: 'Course 3', value: 'course3' },
  ] as const;

  patch(patch: Partial<ProspectusUploadFormValue>): void {
    const next: ProspectusUploadFormValue = { ...this.value, ...patch };
    this.value = next;
    this.valueChange.emit(next);
  }

  onCampusFileSelected(file: File | null): void {
    this.patch({ campusFile: file });
  }

  onCourseFileSelected(file: File | null): void {
    this.patch({ courseFile: file });
  }

  submit(): void {
    this.submitted.emit(this.value);
  }

  private isFormValid(): boolean {
    return (
      this.value.campus.trim().length > 0 &&
      this.value.campusFile !== null &&
      this.value.course.trim().length > 0 &&
      this.value.courseFile !== null
    );
  }
}
