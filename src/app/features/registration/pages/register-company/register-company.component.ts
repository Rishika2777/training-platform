import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  CompanyFormComponent,
  CompanyFormValue,
} from '../../../../shared/components/forms/company-form/company-form.component';
import { RegistrationPageLayoutComponent } from '../../../../layout/registration-page-layout/registration-page-layout.component';
import { NotificationService } from '../../../../core/notifications/notification.service';

@Component({
  selector: 'app-register-company',
  standalone: true,
  imports: [CommonModule, CompanyFormComponent, RegistrationPageLayoutComponent],
  templateUrl: './register-company.component.html',
  styleUrl: './register-company.component.css',
})
export class RegisterCompanyComponent {
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  formValue: CompanyFormValue = CompanyFormComponent.createEmptyValue();
  submitting = false;
  searchValue = '';

  handleSearch(term: string): void {
    const trimmed = term.trim();
    if (!trimmed) {
      return;
    }
    this.notify.info('Search is not implemented yet.');
  }

  submit(value: CompanyFormValue): void {
    console.log('Company Registration Form Values:', value);
    // TODO: wire API call later
    this.formValue = value;
  }

  cancel(): void {
    // TODO: decide navigation target
    void this.router.navigateByUrl('/register-options');
  }
}


