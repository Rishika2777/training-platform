import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-contact-support',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contact-support.component.html',
  styleUrl: './contact-support.component.css',
})
export class ContactSupportComponent {
  @Output() closed = new EventEmitter<void>();
  @Output() optionSelected = new EventEmitter<string>();

  readonly options = [
    { label: 'Help Desk', value: 'help-desk' },
  ];

  onOptionClick(option: { label: string; value: string }): void {
    this.optionSelected.emit(option.value);
  }

  onCancel(): void {
    this.closed.emit();
  }
}
