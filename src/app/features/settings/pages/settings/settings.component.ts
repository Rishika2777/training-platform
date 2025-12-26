import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
})
export class SettingsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly sectionParam = toSignal(this.route.paramMap.pipe(map((p) => p.get('section'))), {
    initialValue: null,
  });

  readonly section = computed(() => this.sectionParam());

  navigateToSection(section: string): void {
    // Navigation is handled by routerLink, this is just for any additional logic if needed
    void this.router.navigate(['/settings', section]);
  }
}

