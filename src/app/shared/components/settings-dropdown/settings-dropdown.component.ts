import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output, computed, inject } from '@angular/core';
import { RoleService } from '../../../core/rbac/role.service';

export type SettingsOption =
  | 'edit-profile'
  | 'password'
  | 'help-center'
  | 'data-privacy'
  | 'contact-support'
  | 'report-issues'
  | 'delete-account'
  | 'my-post'
   | 'my-notice';

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

  private readonly roles = inject(RoleService);

  /** detect department user */
  readonly isDepartmentUser = computed(
    () => this.roles.getUserType() === 'DEPARTMENT'
  );

  /** detect student user – My Notice Board hidden for students */
  readonly isStudentUser = computed(
    () => this.roles.getUserType() === 'STUDENT'
  );
  readonly isAdminUser = computed(
    () => this.roles.isAdmin()
  );

  /** base options */
  private readonly baseOptions: readonly { label: string; value: SettingsOption }[] = [
    { label: 'Edit Profile', value: 'edit-profile' },
    { label: 'Change Password', value: 'password' },
    { label: 'Contact Support', value: 'contact-support' },
    { label: 'Report Issues', value: 'report-issues' },
    { label: 'My Post', value: 'my-post' },
    // { label: 'My Notice Board', value: 'my-notice' },
    { label: 'Delete Account', value: 'delete-account' },
  ];

  /** final options (department: no delete-account; student: no my-notice; label varies by role) */
  readonly options = computed(() => {
    let list = this.baseOptions;
    if (this.isDepartmentUser()) {
      list = list.filter(opt => opt.value !== 'delete-account');
    }
    if (this.isAdminUser()) {
      list = list.filter(opt => opt.value !== 'edit-profile');
    }
    if (this.isStudentUser()) {
      list = list.filter(opt => opt.value !== 'my-notice');
    }
    const isStudent = this.isStudentUser();
    return list.map((opt) => {
      if (opt.value === 'my-post') {
        return { ...opt, label: isStudent ? 'My Post' : 'My Post and Announcements' };
      }
      return opt;
    });
  });

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
