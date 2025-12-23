import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

/**
 * Legacy app had a custom toast container. In Angular 21 app we use ngx-toastr.
 * This component exists for structural parity and future customization.
 */
@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-container.component.html',
  styleUrl: './toast-container.component.css',
})
export class ToastContainerComponent {}


