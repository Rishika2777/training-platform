import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputComponent } from '../../input/input.component';
import { TextareaComponent } from '../../textarea/textarea.component';
import { ButtonComponent } from '../../button/button.component';

export interface DepartmentFormValue {
  departmentName: string;
  email: string;
  phone: string;
  about: string;
  photoUrl?: string;
  photo?: File | null;
}

@Component({
  selector: 'app-department-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputComponent,
    TextareaComponent,
    ButtonComponent,
  ],
  templateUrl: './department-form.component.html',
   styleUrls: ['./department-form.component.css'] 
})
export class DepartmentFormComponent {

  @Input() value: DepartmentFormValue = {
    departmentName: '',
    email: '',
    phone: '',
    about: '',
    photoUrl: '',
    photo: null
  };

  @Input() submitting = false;
  @Input() isEditMode = false;
  @Input() verifiedPhoneNumber: string | null = null; // Phone number that has been verified

  @Output() submitted = new EventEmitter<DepartmentFormValue>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() valueChange = new EventEmitter<DepartmentFormValue>();
  @Output() verifyPhone = new EventEmitter<{ phoneNumber: string; fieldType: 'mobile' | 'adminPhone' | 'phone' }>();

  patch(updates: Partial<DepartmentFormValue>) {
    this.value = { ...this.value, ...updates };
    this.valueChange.emit(this.value);
  }

  onSubmit() {
    this.submitted.emit(this.value);
  }

  onCancel() {
    this.cancelled.emit();
  }

  onPhotoSelected(files: FileList | null) {
    if (!files?.length) return;
    this.patch({ photo: files[0] });
  }
}
