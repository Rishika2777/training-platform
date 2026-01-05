import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

export type SettingsOption = 'edit-profile' | 'password' | 'help-center' | 'data-privacy' | 'contact-support' | 'report-issues' | 'delete-account';

@Component({
  selector: 'app-settings-dropdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './settings-dropdown.component.html',
  styleUrl: './settings-dropdown.component.css',
})
export class SettingsDropdownComponent {
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();
  @Output() optionSelected = new EventEmitter<SettingsOption>();

  readonly options: readonly { label: string; value: SettingsOption }[] = [
    { label: 'Edit Profile', value: 'edit-profile' },
    { label: 'Change Password', value: 'password' },
    { label: 'Data Privacy', value: 'data-privacy' },
    { label: 'Visibility', value: 'help-center' },
    { label: 'Contact Support', value: 'contact-support' },
    { label: 'Report Issues', value: 'report-issues' },
    { label: 'Delete Account', value: 'delete-account' },
  ];

  close(): void {
    this.closed.emit();
  }

  handleOptionClick(option: SettingsOption): void {
    this.optionSelected.emit(option);
    this.close();
  }

  @HostListener('click', ['$event'])
  onClick(event: Event): void {
    event.stopPropagation();
  }
}

