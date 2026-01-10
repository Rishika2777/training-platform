import { CommonModule } from '@angular/common';
import { Component, signal, computed, inject } from '@angular/core';
import { RouterOutlet, ActivatedRoute } from '@angular/router';
import { AppHeaderComponent } from '../../shared/components/header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, AppHeaderComponent],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.css',
})
export class DashboardLayoutComponent {
  private readonly route = inject(ActivatedRoute);
  
  readonly sidebarCollapsed = signal(false);
  
  // Check if standalone mode via query param
  private readonly standaloneParam = toSignal(
    this.route.queryParams.pipe(
      map(params => params['standalone'] === 'true')
    ),
    { initialValue: false }
  );
  
  readonly isStandalone = computed(() => this.standaloneParam());

  toggleSidebar(): void {
    this.sidebarCollapsed.update((v) => !v);
  }
}


