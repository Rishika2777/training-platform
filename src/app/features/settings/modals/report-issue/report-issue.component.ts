import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-report-issue',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './report-issue.component.html',
  styleUrl: './report-issue.component.css',
})
export class ReportIssueComponent {
  @Output() closed = new EventEmitter<void>();
  @Output() optionSelected = new EventEmitter<string>();

  readonly options = [
    { label: 'Feedback', value: 'feedback' },
    { label: 'Bug Report', value: 'bug-report' },
  ];

  onOptionClick(option: { label: string; value: string }): void {
    this.optionSelected.emit(option.value);
  }

  onCancel(): void {
    this.closed.emit();
  }
}
