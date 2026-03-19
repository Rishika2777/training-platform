import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

type ModalSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css',
})
export class ModalComponent {
  @Input() visible = false;
  @Input() title = '';
  @Input() size: ModalSize = 'md';
  @Input() modalClass: string | null = null;
  @Input() titleAlign: 'left' | 'center' = 'center';
  @Input() hideCloseButton = false;
  /** When true, modal stacks above other modals (higher z-index, darker backdrop) */
  @Input() stacked = false;

  @Output() closed = new EventEmitter<void>();

  close(): void {
    this.closed.emit();
  }

  onBackdropClick(): void {
    this.close();
  }
}


