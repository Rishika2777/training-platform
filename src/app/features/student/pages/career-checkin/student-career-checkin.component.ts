import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { DropdownComponent } from '../../../../shared/components/dropdown/dropdown.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { StudentApiService } from '../../services/student-api.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { catchError, of } from 'rxjs';

export interface CareerCheckinFormValue {
  companyName: string;
  jobTitle: string;
  startDate: string;
  endDate: string;
  currentlyWorking: boolean;
  recnHelped: boolean;
}

@Component({
  selector: 'app-student-career-checkin',
  standalone: true,
  imports: [CommonModule, ButtonComponent, DropdownComponent, InputComponent],
  templateUrl: './student-career-checkin.component.html',
  styleUrl: './student-career-checkin.component.css',
})
export class StudentCareerCheckinComponent {
  private readonly studentApiService = inject(StudentApiService);
  private readonly authService = inject(AuthService);

  @Input() submitting = false;
  @Input() value: CareerCheckinFormValue = {
    companyName: '',
    jobTitle: '',
    startDate: '',
    endDate: '',
    currentlyWorking: false,
    recnHelped: false,
  };

  @Output() valueChange = new EventEmitter<CareerCheckinFormValue>();
  @Output() submitted = new EventEmitter<CareerCheckinFormValue>();
  @Output() loadError = new EventEmitter<string>();

  readonly jobTitleItems = [
    { label: 'Software Engineer', value: 'software-engineer' },
    { label: 'Product Manager', value: 'product-manager' },
    { label: 'Data Analyst', value: 'data-analyst' },
    { label: 'UI/UX Designer', value: 'ui-ux-designer' },
    { label: 'Business Analyst', value: 'business-analyst' },
  ] as const;

  patch(patch: Partial<CareerCheckinFormValue>): void {
    const next: CareerCheckinFormValue = { ...this.value, ...patch };
    this.value = next;
    this.valueChange.emit(next);
  }

  toggleCurrentlyWorking(): void {
    this.patch({ currentlyWorking: !this.value.currentlyWorking });
  }

  toggleRecnHelped(): void {
    this.patch({ recnHelped: !this.value.recnHelped });
  }

  loadCareerCheckIn(): void {
    const currentUser = this.authService.getCurrentUser();
    const userId = currentUser?.userId?.toString();

    if (!userId) {
      console.warn('User ID not found. Cannot load career check-in.');
      this.loadError.emit('User ID not found');
      return;
    }

    this.studentApiService
      .getCareerCheckIn(userId)
      .pipe(
        catchError((error) => {
          console.error('Error loading career check-in:', error);
          // 404 is expected if no career check-in exists yet
          if (error.status !== 404) {
            this.loadError.emit(error.message || 'Failed to load career check-in');
          }
          return of(null);
        }),
      )
      .subscribe({
        next: (response) => {
          if (response?.success && response.data) {
            const data = response.data;
            this.patch({
              companyName: data.companyName || '',
              jobTitle: data.jobTitle || '',
              startDate: data.startDate || '',
              endDate: data.endDate || '',
              currentlyWorking: data.isCurrentlyWorking || false,
              recnHelped: data.recnHelped || false,
            });
          }
        },
      });
  }

  submit(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.submitted.emit(this.value);
  }
}

