import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, signal, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppHeaderComponent } from '../../shared/components/header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';

const MOBILE_BREAKPOINT = 768;

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, AppHeaderComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css',
})
export class AdminLayoutComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);

  readonly sidebarCollapsed = signal(false);
  readonly isMobile = signal(false);

  toggleSidebar(): void {
    this.sidebarCollapsed.update((v) => !v);
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId as object)) {
      this.updateMobileState();
      window.addEventListener('resize', () => this.updateMobileState());
    }
  }

  private updateMobileState(): void {
    const mobile = typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT;
    const wasMobile = this.isMobile();
    this.isMobile.set(mobile);
    if (mobile && !wasMobile) {
      this.sidebarCollapsed.set(true);
    }
  }

  onSidebarMenuClick(): void {
    if (this.isMobile()) {
      this.sidebarCollapsed.set(true);
    }
  }
}


