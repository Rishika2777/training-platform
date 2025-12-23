import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface NotificationItem {
  id: string;
  title: string;
  timeLabel?: string;
}

@Component({
  selector: 'app-notifications-dropdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications-dropdown.component.html',
  styleUrl: './notifications-dropdown.component.css',
})
export class NotificationsDropdownComponent {
  @Input() isOpen = false;
  @Input() items: readonly NotificationItem[] = [];

  @Output() closed = new EventEmitter<void>();

  close(): void {
    this.closed.emit();
  }
}


