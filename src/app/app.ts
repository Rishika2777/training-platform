import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PwaInstallBannerComponent } from './shared/components/pwa-install-banner/pwa-install-banner.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PwaInstallBannerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('synkup');
}
