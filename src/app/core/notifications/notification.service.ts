import { Injectable, inject } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly toastr = inject(ToastrService);

  success(message: string, title?: string): void {
    // Defer to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => this.toastr.success(message, title), 0);
  }

  info(message: string, title?: string): void {
    setTimeout(() => this.toastr.info(message, title), 0);
  }

  warn(message: string, title?: string): void {
    setTimeout(() => this.toastr.warning(message, title), 0);
  }

  error(message: string, title?: string): void {
    setTimeout(() => this.toastr.error(message, title), 0);
  }
}


