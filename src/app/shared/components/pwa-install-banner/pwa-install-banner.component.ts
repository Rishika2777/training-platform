import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PwaInstallService } from '../../../core/pwa/pwa-install.service';

@Component({
  selector: 'app-pwa-install-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pwa-install-banner.component.html',
  styleUrl: './pwa-install-banner.component.css',
})
export class PwaInstallBannerComponent {
  readonly pwa = inject(PwaInstallService);

  readonly shouldShow = this.pwa.shouldShowBanner;

  async install(): Promise<void> {
    await this.pwa.promptInstall();
  }

  dismiss(): void {
    this.pwa.dismiss();
  }
}
