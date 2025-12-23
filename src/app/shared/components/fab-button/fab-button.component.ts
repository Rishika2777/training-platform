import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

type FabSize = 'sm' | 'md';
type FabVariant = 'primary' | 'secondary';

@Component({
  selector: 'app-fab-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fab-button.component.html',
  styleUrl: './fab-button.component.css',
})
export class FabButtonComponent {
  @Input() size: FabSize = 'md';
  @Input() variant: FabVariant = 'primary';
  @Input() title = '';
  @Input() icon: string | null = null;

  @Output() clicked = new EventEmitter<void>();

  onClick(): void {
    this.clicked.emit();
  }
}


