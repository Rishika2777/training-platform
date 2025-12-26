import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { TextareaComponent } from '../../../../shared/components/textarea/textarea.component';
import { DropdownComponent, DropdownItem } from '../../../../shared/components/dropdown/dropdown.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';

@Component({
  selector: 'app-report-issues',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, InputComponent, TextareaComponent, DropdownComponent, ButtonComponent],
  templateUrl: './report-issues.component.html',
  styleUrl: './report-issues.component.css',
})
export class ReportIssuesComponent {
  private readonly fb = inject(FormBuilder);
  reportForm: FormGroup;
  selectedFiles: File[] = [];

  issueTypes: DropdownItem<string>[] = [
    { label: 'Bug', value: 'bug' },
    { label: 'Performance Issue', value: 'performance' },
    { label: 'UI/UX Problem', value: 'ui-ux' },
    { label: 'Security Concern', value: 'security' },
    { label: 'Other', value: 'other' }
  ];

  priorityLevels: DropdownItem<string>[] = [
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' },
    { label: 'Critical', value: 'critical' }
  ];

  constructor() {
    this.reportForm = this.fb.group({
      issueType: ['', Validators.required],
      heading: ['', [Validators.required, Validators.minLength(5)]],
      subHeading: [''],
      description: ['', [Validators.required, Validators.minLength(20)]],
      priority: ['', Validators.required],
    });
  }

  onFileChange(files: FileList): void {
    if (files) {
      this.selectedFiles = Array.from(files);
    }
  }

  onSubmit(): void {
    if (this.reportForm.valid) {
      const formData = {
        ...this.reportForm.value,
        attachments: this.selectedFiles,
        timestamp: new Date().toISOString()
      };
      console.log('Report submitted:', formData);
      // TODO: Implement API call to submit report
      alert('Your report has been submitted successfully! We will review it shortly.');
      this.reportForm.reset();
      this.selectedFiles = [];
    }
  }

  onCancel(): void {
    this.reportForm.reset();
    this.selectedFiles = [];
  }
}
