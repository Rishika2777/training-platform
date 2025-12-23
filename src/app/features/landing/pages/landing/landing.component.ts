import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { RoleService } from '../../../../core/rbac/role.service';
import { LandingFeatureRowComponent } from '../../../../shared/components/landing-feature-row/landing-feature-row.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, LandingFeatureRowComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css',
})
export class LandingComponent implements OnInit {
  private readonly roles = inject(RoleService);
  private readonly router = inject(Router);

  readonly year = new Date().getFullYear();

  ngOnInit(): void {
    // Legacy LandingController behavior:
    // If user is already logged in, redirect to dashboard/home immediately.
    if (this.roles.isAuthenticated()) {
      void this.router.navigateByUrl(this.roles.getHomeRouteForUser());
    }
  }

  goToLogin(): void {
    void this.router.navigate(['/login']);
  }

  goToRegister(): void {
    void this.router.navigate(['/register']);
  }

  goToRegisterOptions(): void {
    void this.router.navigate(['/register-options']);
  }
}


