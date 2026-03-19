import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { TextareaComponent } from '../../../../shared/components/textarea/textarea.component';
import { DepartmentDetailService } from '../../services/department-detail.service';
import { CampusApiService } from '../../services/campus-api.service';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { StorageService } from '../../../../core/storage/storage.service';
import { STORAGE_KEYS } from '../../../../core/config/app.constants';
import { finalize } from 'rxjs/operators';

export interface DepartmentFormValue {
  name: string;
  email: string;
  phone: string;
  photo: File | null;
  about: string;
}

@Component({
  selector: 'app-add-department',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonComponent,
    InputComponent,
    TextareaComponent,
  ],
  templateUrl: './add-department.component.html',
  styleUrl: './add-department.component.css',
})
export class AddDepartmentComponent implements OnInit {

  private readonly campusApi = inject(CampusApiService);
  private readonly notify = inject(NotificationService);
  private readonly storage = inject(StorageService);
  private readonly deptService = inject(DepartmentDetailService);

  @ViewChild('photoFileInput') photoFileInput!: ElementRef<HTMLInputElement>;

  @Input() submitting = false;
  @Input() value: DepartmentFormValue = {
    name: '',
    email: '',
    phone: '',
    photo: null,
    about: '',
  };

  @Output() valueChange = new EventEmitter<DepartmentFormValue>();
  @Output() submitted = new EventEmitter<DepartmentFormValue>();
  @Output() cancelled = new EventEmitter<void>();

  submitAttempted = false;
  photoName = '';

  // EDIT MODE
  editMode = false;
  editingDepartmentId: string | null = null;
  updatingDepartment = false;

  // =============================
  // PREFILL EDIT DATA
  // =============================
  ngOnInit(): void {
  const editData = this.deptService.editDepartmentData();

  if (editData) {
    console.log('EDIT DEPARTMENT DATA:', editData);

    this.editMode = true;

    //  ensure Mongo id store ho
    this.editingDepartmentId = editData.id?.trim();

    this.value = {
      name: editData.name || '',
      email: editData.email || '',
      phone: editData.phone || '',
      photo: null,
      about: editData.about || '',
    };

    this.photoName = editData.imageUrl || '';
    this.valueChange.emit(this.value);
  }
}


  patch(updates: Partial<DepartmentFormValue>): void {
    this.value = { ...this.value, ...updates };
    this.valueChange.emit(this.value);
  }

  triggerPhotoSelect(): void {
    this.photoFileInput.nativeElement.click();
  }

  onPhotoSelected(files: FileList | null): void {
    if (!files || files.length === 0) return;

    const file = files[0];
    this.photoName = file.name;
    this.patch({ photo: file });
  }

  // =============================
  // SUBMIT
  // =============================
  onFormSubmit(event: Event): void {
    event.preventDefault();
    this.submitAttempted = true;

    if (!this.isFormValid()) return;

    if (this.editMode) {
      this.updateDepartment();
      return;
    }

    this.submitted.emit(this.value);
  }

  // =============================
  // UPDATE DEPARTMENT
  // =============================
private updateDepartment(): void {

  if (!this.editingDepartmentId || !this.editingDepartmentId.trim()) {
    this.notify.error('Department ID missing');
    return;
  }

  const campusEmail = this.getCampusEmail();

  if (!campusEmail) {
    this.notify.error('Campus email missing');
    return;
  }

  const deptId = this.editingDepartmentId.trim();

  // 🔥 plain object send karo (service FormData banayegi)
  const payload = {
    departmentName: this.value.name?.trim(),
    email: this.value.email?.trim(),
    phone: this.value.phone?.trim(),
    aboutDepartment: this.value.about?.trim(),
    photo: this.value.photo || null
  };

  this.updatingDepartment = true;

  this.campusApi.updateDepartment(deptId, payload, campusEmail)
    .pipe(finalize(() => (this.updatingDepartment = false)))
    .subscribe({
      next: (res) => {
        if (res?.success) {
          this.notify.success(res.message || 'Department updated successfully');
          window.dispatchEvent(new Event('departmentUpdated'));
          this.onCancel();
        } else {
          this.notify.error(res?.error || 'Update failed');
        }
      },

      error: (err) => {
        const msg =
          err?.error?.message ||
          err?.message ||
          'Failed to update department';
        this.notify.error(msg);
      },
    });
}






  // =============================
  // GET CAMPUS EMAIL
  // =============================
  private getCampusEmail(): string | null {
    const userData = this.storage.get(STORAGE_KEYS.USER_DATA);

    if (userData && typeof userData === 'object' && 'email' in userData) {
      return (userData as { email?: string }).email || null;
    }

    return null;
  }

  onCancel(): void {
    this.cancelled.emit();
    this.resetForm();
  }

  resetForm(): void {
    this.value = {
      name: '',
      email: '',
      phone: '',
      photo: null,
      about: '',
    };
    this.photoName = '';
    this.submitAttempted = false;
    this.valueChange.emit(this.value);
  }

  isFormValid(): boolean {
    return !!(
      this.value.name.trim() &&
      this.value.email.trim() &&
      this.isValidEmail(this.value.email) &&
      this.value.phone.trim()
    );
  }

  isNameInvalid(): boolean {
    return this.submitAttempted && !this.value.name.trim();
  }

  isEmailInvalid(): boolean {
    const email = this.value.email.trim();
    return this.submitAttempted && (!email || !this.isValidEmail(email));
  }

  isPhoneInvalid(): boolean {
    return this.submitAttempted && !this.value.phone.trim();
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
