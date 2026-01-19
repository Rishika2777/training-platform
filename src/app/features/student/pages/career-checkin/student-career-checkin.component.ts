import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { DropdownComponent } from '../../../../shared/components/dropdown/dropdown.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { StudentApiService } from '../../services/student-api.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { CompanyApiService } from '../../../company/services/company-api.service';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { catchError, of } from 'rxjs';
import { map } from 'rxjs/operators';

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
export class StudentCareerCheckinComponent implements OnInit {
  private readonly studentApiService = inject(StudentApiService);
  private readonly authService = inject(AuthService);
  private readonly companyApi = inject(CompanyApiService);
  private readonly notify = inject(NotificationService);
  private readonly cdr = inject(ChangeDetectorRef);
  submittingInternal = false;

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

  fetchCompanies = (searchTerm: string) => {
    return this.companyApi.getCompanyBySearch(searchTerm, 0, 20).pipe(
      map((resp) => {
        const content = Array.isArray(resp?.data)
          ? resp?.data
          : resp?.data?.content || [];
        return content.map((c) => ({
          label: c.companyName || '',
          value: c.companyName || '',
        }));
      }),
      catchError(() => of([])),
    );
  };

  toggleCurrentlyWorking(): void {
    this.patch({ currentlyWorking: !this.value.currentlyWorking });
  }

  toggleRecnHelped(): void {
    this.patch({ recnHelped: !this.value.recnHelped });
  }

  ngOnInit(): void {
    // This component is now only created when the modal is open (wrapped with @if in student-home).
    // So ngOnInit is the correct place to load existing data.
    this.loadCareerCheckIn();
  }

  loadCareerCheckIn(): void {
    const currentUser = this.authService.getCurrentUser();
    const studentId = currentUser?.studentId?.toString();

    if (!studentId) {
      console.warn('Student ID not found. Cannot load career check-in.');
      this.loadError.emit('Student ID not found');
      return;
    }

    this.studentApiService
      .getCareerCheckIn(studentId)
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
            // Some parts of the app appear to use manual change detection.
            // Defer to avoid ExpressionChangedAfterItHasBeenCheckedError.
            setTimeout(() => this.cdr.detectChanges(), 0);
          }
        },
      });
  }

  submit(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (this.submittingInternal) {
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    const studentId = currentUser?.studentId?.toString();

    if (!studentId) {
      this.loadError.emit('Student ID not found');
      return;
    }

    this.submittingInternal = true;

    const request = {
      companyName: this.value.companyName.trim(),
      jobTitle: this.value.jobTitle.trim(),
      startDate: this.value.startDate,
      endDate: this.value.currentlyWorking ? (this.value.endDate || '') : this.value.endDate,
      isCurrentlyWorking: this.value.currentlyWorking,
      recnHelped: this.value.recnHelped,
    };

    this.studentApiService
      .createOrUpdateCareerCheckIn(studentId, request)
      .pipe(
        catchError((error) => {
          this.submittingInternal = false;
          const msg = error?.message || 'Failed to submit career check-in';
          this.loadError.emit(msg);
          this.notify.error(msg);
          return of(null);
        }),
      )
      .subscribe((resp) => {
        this.submittingInternal = false;
        if (resp?.success) {
          this.notify.success(resp.message || 'Career check-in updated successfully.');
          this.submitted.emit(this.value);
        } else if (resp) {
          const msg = resp.message || 'Failed to submit career check-in';
          this.loadError.emit(msg);
          this.notify.error(msg);
        }
      });
  }
}

