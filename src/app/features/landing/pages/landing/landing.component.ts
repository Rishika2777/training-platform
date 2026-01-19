import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { RoleService } from '../../../../core/rbac/role.service';
import { LandingFeatureRowComponent } from '../../../../shared/components/landing-feature-row/landing-feature-row.component';
import { CampusApiService, CarouselItemResponse } from '../../../campus/services/campus-api.service';
import { catchError, of } from 'rxjs';

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
  private readonly campusApi = inject(CampusApiService);

  readonly year = new Date().getFullYear();

  campusesCarousel: CarouselItemResponse[] = [];
  campusCarouselIndex = 0;

  companiesCarousel: CarouselItemResponse[] = [];
  companyCarouselIndex = 0;

  get currentCampus(): CarouselItemResponse | null {
    if (!this.campusesCarousel.length) {
      return null;
    }
    const idx = ((this.campusCarouselIndex % this.campusesCarousel.length) + this.campusesCarousel.length) % this.campusesCarousel.length;
    return this.campusesCarousel[idx] ?? null;
  }

  get currentCompany(): CarouselItemResponse | null {
    if (!this.companiesCarousel.length) {
      return null;
    }
    const idx =
      ((this.companyCarouselIndex % this.companiesCarousel.length) + this.companiesCarousel.length) %
      this.companiesCarousel.length;
    return this.companiesCarousel[idx] ?? null;
  }

  ngOnInit(): void {
    // Legacy LandingController behavior:
    // If user is already logged in, redirect to dashboard/home immediately.
    if (this.roles.isAuthenticated()) {
      void this.router.navigateByUrl(this.roles.getHomeRouteForUser());
      return;
    }

    this.loadCampusesCarousel();
    this.loadCompaniesCarousel();
  }

  loadCampusesCarousel(): void {
    this.campusApi
      .getCampusesCarousel(10)
      .pipe(
        catchError(() => of(null)),
      )
      .subscribe((resp) => {
        const items = resp?.success && Array.isArray(resp.data) ? resp.data : [];
        this.campusesCarousel = items;
        this.campusCarouselIndex = 0;
      });
  }

  loadCompaniesCarousel(): void {
    this.campusApi
      .getCompaniesCarousel(10)
      .pipe(catchError(() => of(null)))
      .subscribe((resp) => {
        const items = resp?.success && Array.isArray(resp.data) ? resp.data : [];
        this.companiesCarousel = items;
        this.companyCarouselIndex = 0;
      });
  }

  previousCampus(): void {
    if (!this.campusesCarousel.length) {
      return;
    }
    this.campusCarouselIndex = (this.campusCarouselIndex - 1 + this.campusesCarousel.length) % this.campusesCarousel.length;
  }

  nextCampus(): void {
    if (!this.campusesCarousel.length) {
      return;
    }
    this.campusCarouselIndex = (this.campusCarouselIndex + 1) % this.campusesCarousel.length;
  }

  previousCompany(): void {
    if (!this.companiesCarousel.length) {
      return;
    }
    this.companyCarouselIndex =
      (this.companyCarouselIndex - 1 + this.companiesCarousel.length) % this.companiesCarousel.length;
  }

  nextCompany(): void {
    if (!this.companiesCarousel.length) {
      return;
    }
    this.companyCarouselIndex = (this.companyCarouselIndex + 1) % this.companiesCarousel.length;
  }

  companyCardTitle(): string {
    const c = this.currentCompany;
    return c?.companyName || c?.name || c?.title || 'Company Name';
  }

  companyDescription(): string {
    const c = this.currentCompany;
    return (
      c?.description ||
      'Lorem ipsum dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since'
    );
  }

  companyImage(): string {
    const c = this.currentCompany;
    return c?.companyLogoUrl || c?.logoUrl || c?.imageUrl || 'assets/images/landing-card-company.png';
  }

  campusCardTitle(): string {
    const c = this.currentCampus;
    return c?.campusName || c?.name || c?.title || 'Campus Name';
  }

  campusDescription(): string {
    const c = this.currentCampus;
    return (
      c?.description ||
      'Lorem ipsum dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since'
    );
  }

  campusImage(): string {
    const c = this.currentCampus;
    return (
      c?.campusLogoUrl ||
      c?.logoUrl ||
      c?.imageUrl ||
      'assets/images/landing-card-campus.png'
    );
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


