import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-settings-menu',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './settings-menu.component.html',
  styleUrl: './settings-menu.component.css',
})
export class SettingsMenuComponent {
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();

  close(): void {
    this.closed.emit();
  }
}


