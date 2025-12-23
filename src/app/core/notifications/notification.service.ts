import { Injectable, inject } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly toastr = inject(ToastrService);

  success(message: string, title?: string): void {
    this.toastr.success(message, title);
  }

  info(message: string, title?: string): void {
    this.toastr.info(message, title);
  }

  warn(message: string, title?: string): void {
    this.toastr.warning(message, title);
  }

  error(message: string, title?: string): void {
    this.toastr.error(message, title);
  }
}


