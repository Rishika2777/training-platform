import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject, ViewChild, ElementRef, HostListener, ChangeDetectorRef, NgZone, computed } from '@angular/core';
import { Router } from '@angular/router';
import { RoleService } from '../../../../core/rbac/role.service';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { LandingFeatureRowComponent } from '../../../../shared/components/landing-feature-row/landing-feature-row.component';
import { AvatarComponent } from '../../../../shared/components/avatar/avatar.component';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, Subscription } from 'rxjs';
import { finalize } from 'rxjs';
import { LandingApiService } from '../../services/landing-api.service';
import { CarouselItemResponse, InstitutionResponse, LandingAnnouncementItem, SearchResultResponse } from '../../models/landing.models';

const AUTOSEARCH_MIN_LENGTH = 2;
const AUTOSEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, LandingFeatureRowComponent, AvatarComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css',
})
export class LandingComponent implements OnInit, OnDestroy {
  private readonly roles = inject(RoleService);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);
  private readonly landingApi = inject(LandingApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);

  readonly year = new Date().getFullYear();
  readonly isLoggedIn = computed(() => this.roles.isAuthenticated());

  searchQuery = '';
  searchResults: SearchResultResponse[] = [];
  searchLoading = false;
  searchDropdownVisible = false;
  private readonly searchSubject = new Subject<string>();
  private searchSubscription: Subscription | null = null;

  @ViewChild('searchContainer') searchContainer?: ElementRef<HTMLElement>;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const el = this.searchContainer?.nativeElement;
    if (el && event.target instanceof Node && !el.contains(event.target)) {
      this.closeSearchDropdown();
    }
  }

  campusesCarousel: CarouselItemResponse[] = [];
  campusCarouselIndex = 0;
  campusLoading = false;
  campusError = '';

  companiesCarousel: CarouselItemResponse[] = [];
  companyCarouselIndex = 0;
  companyLoading = false;
  companyError = '';

  institutions: InstitutionResponse[] = [];
  institutionIndex = 0;
  institutionLoading = false;
  institutionError = '';

  latestNews: LandingAnnouncementItem[] = [];
  newsLoading = false;
  newsError = 'News section coming soon';

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

  get currentInstitution(): InstitutionResponse | null {
    if (!this.institutions.length) {
      return null;
    }
    const idx =
      ((this.institutionIndex % this.institutions.length) + this.institutions.length) %
      this.institutions.length;
    return this.institutions[idx] ?? null;
  }

  ngOnInit(): void {
    this.loadCampusesCarousel();
    this.loadCompaniesCarousel();

    this.searchSubscription = this.searchSubject
      .pipe(
        debounceTime(AUTOSEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        switchMap((query) => {
          const q = query.trim();
          if (q.length < AUTOSEARCH_MIN_LENGTH) {
            this.searchResults = [];
            this.searchDropdownVisible = false;
            this.cdr.detectChanges();
            return of({ success: true, data: [] as SearchResultResponse[] });
          }
          this.searchLoading = true;
          this.cdr.detectChanges();
          return this.landingApi.autosearch(q).pipe(
            finalize(() => {
              this.searchLoading = false;
              this.cdr.detectChanges();
            }),
          );
        }),
      )
      .subscribe({
        next: (resp) => {
          const list = resp?.data ?? [];
          this.searchResults = list;
          this.searchDropdownVisible = list.length > 0;
          this.cdr.detectChanges();
        },
        error: () => {
          this.searchResults = [];
          this.searchDropdownVisible = false;
          this.cdr.detectChanges();
        },
      });
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  onSearchInput(value: string): void {
    this.searchQuery = value;
    this.searchSubject.next(value);
  }

  selectSearchResult(result: SearchResultResponse): void {
    this.searchDropdownVisible = false;
    this.searchResults = [];
    if (result.type === 'STUDENT' && result.publicId) {
      const url = this.router.serializeUrl(
        this.router.createUrlTree(['/profile/student', result.publicId]),
      );
      window.open(url, '_blank');
    } else if (result.type === 'COMPANY' && result.publicId) {
      const url = this.router.serializeUrl(
        this.router.createUrlTree(['/profile/company', result.publicId]),
      );
      window.open(url, '_blank');
    } else if (result.type === 'CAMPUS' && result.publicId) {
      const url = this.router.serializeUrl(
        this.router.createUrlTree(['/profile/campus', result.publicId]),
      );
      window.open(url, '_blank');
    } else if (result.routeUrl) {
      window.open(result.routeUrl, '_blank');
    }
    this.searchQuery = '';
  }

  closeSearchDropdown(): void {
    this.searchDropdownVisible = false;
  }

  loadCampusesCarousel(): void {
    this.campusLoading = true;
    this.campusError = '';
    this.landingApi
      .getCampusesCarousel(10)
      .pipe(finalize(() => {
        this.ngZone.runOutsideAngular(() => {
          setTimeout(() => {
            this.ngZone.run(() => {
              this.campusLoading = false;
            });
          }, 0);
        });
      }))
      .subscribe({
        next: (resp) => {
          const items = resp?.success && Array.isArray(resp.data) ? resp.data : [];
          const err = !resp?.success ? (resp?.message || 'Unable to load campuses') : '';
          this.ngZone.runOutsideAngular(() => {
            setTimeout(() => {
              this.ngZone.run(() => {
                this.campusesCarousel = items;
                this.campusCarouselIndex = 0;
                this.campusError = err;
              });
            }, 0);
          });
        },
        error: () => {
          this.ngZone.runOutsideAngular(() => {
            setTimeout(() => {
              this.ngZone.run(() => {
                this.campusesCarousel = [];
                this.campusCarouselIndex = 0;
                this.campusError = 'Unable to load campuses';
              });
            }, 0);
          });
        },
      });
  }

  loadCompaniesCarousel(): void {
    this.companyLoading = true;
    this.companyError = '';
    this.landingApi
      .getCompaniesCarousel(10)
      .pipe(finalize(() => {
        this.ngZone.runOutsideAngular(() => {
          setTimeout(() => {
            this.ngZone.run(() => {
              this.companyLoading = false;
            });
          }, 0);
        });
      }))
      .subscribe({
        next: (resp) => {
          const items = resp?.success && Array.isArray(resp.data) ? resp.data : [];
          const err = !resp?.success ? (resp?.message || 'Unable to load companies') : '';
          this.ngZone.runOutsideAngular(() => {
            setTimeout(() => {
              this.ngZone.run(() => {
                this.companiesCarousel = items;
                this.companyCarouselIndex = 0;
                this.companyError = err;
              });
            }, 0);
          });
        },
        error: () => {
          this.ngZone.runOutsideAngular(() => {
            setTimeout(() => {
              this.ngZone.run(() => {
                this.companiesCarousel = [];
                this.companyCarouselIndex = 0;
                this.companyError = 'Unable to load companies';
              });
            }, 0);
          });
        },
      });
  }

  loadInstitutionsRegistered(): void {
    this.institutionLoading = true;
    this.institutionError = '';
    this.landingApi
      .getInstitutionsRegistered()
      .pipe(finalize(() => {
        this.ngZone.runOutsideAngular(() => {
          setTimeout(() => {
            this.ngZone.run(() => {
              this.institutionLoading = false;
            });
          }, 0);
        });
      }))
      .subscribe({
        next: (resp) => {
          const items = resp?.success && Array.isArray(resp.data) ? resp.data : [];
          const err = !resp?.success ? (resp?.message || 'Unable to load institutions') : '';
          this.ngZone.runOutsideAngular(() => {
            setTimeout(() => {
              this.ngZone.run(() => {
                this.institutions = items;
                this.institutionIndex = 0;
                this.institutionError = err;
              });
            }, 0);
          });
        },
        error: () => {
          this.ngZone.runOutsideAngular(() => {
            setTimeout(() => {
              this.ngZone.run(() => {
                this.institutions = [];
                this.institutionIndex = 0;
                this.institutionError = 'Unable to load institutions';
              });
            }, 0);
          });
        },
      });
  }

  loadLatestNews(): void {
    this.newsLoading = true;
    this.newsError = '';
    this.landingApi
      .getLatestNews(3)
      .pipe(finalize(() => {
        this.ngZone.runOutsideAngular(() => {
          setTimeout(() => {
            this.ngZone.run(() => {
              this.newsLoading = false;
            });
          }, 0);
        });
      }))
      .subscribe({
        next: (resp) => {
          const items = resp?.success && Array.isArray(resp.data) ? resp.data : [];
          const err = !resp?.success ? (resp?.message || 'Unable to load news') : '';
          this.ngZone.runOutsideAngular(() => {
            setTimeout(() => {
              this.ngZone.run(() => {
                this.latestNews = items;
                this.newsError = err;
              });
            }, 0);
          });
        },
        error: () => {
          this.ngZone.runOutsideAngular(() => {
            setTimeout(() => {
              this.ngZone.run(() => {
                this.latestNews = [];
                this.newsError = 'Unable to load news';
              });
            }, 0);
          });
        },
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

  previousInstitution(): void {
    if (!this.institutions.length) {
      return;
    }
    this.institutionIndex = (this.institutionIndex - 1 + this.institutions.length) % this.institutions.length;
  }

  nextInstitution(): void {
    if (!this.institutions.length) {
      return;
    }
    this.institutionIndex = (this.institutionIndex + 1) % this.institutions.length;
  }

  companyCardTitle(): string {
    if (this.companyLoading) return 'Loading companies...';
    if (this.companyError) return 'Companies unavailable';
    const c = this.currentCompany;
    return c?.companyName || c?.name || c?.title || 'Company Name';
  }

  companyDescription(): string {
    if (this.companyLoading) {
      return 'Loading company data...';
    }
    if (this.companyError) {
      return this.companyError;
    }
    const c = this.currentCompany;
    return (
      c?.description ||
      'Lorem ipsum dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since'
    );
  }

  companyImage(): string {
    if (this.companyError) {
      return 'assets/images/landing-card-company.png';
    }
    const c = this.currentCompany;
    return c?.companyLogoUrl || c?.logoUrl || c?.imageUrl || 'assets/images/landing-card-company.png';
  }

  campusCardTitle(): string {
    if (this.campusLoading) return 'Loading campuses...';
    if (this.campusError) return 'Campuses unavailable';
    const c = this.currentCampus;
    return c?.campusName || c?.name || c?.title || 'Campus Name';
  }

  campusDescription(): string {
    if (this.campusLoading) {
      return 'Loading campus data...';
    }
    if (this.campusError) {
      return this.campusError;
    }
    const c = this.currentCampus;
    return (
      c?.description ||
      'Lorem ipsum dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since'
    );
  }

  campusImage(): string {
    if (this.campusError) {
      return 'assets/images/landing-card-campus.png';
    }
    const c = this.currentCampus;
    return (
      c?.campusLogoUrl ||
      c?.logoUrl ||
      c?.imageUrl ||
      'assets/images/landing-card-campus.png'
    );
  }

  institutionCardTitle(): string {
    if (this.institutionLoading) return 'Loading institutions...';
    if (this.institutionError) return 'Institutions unavailable';
    const institution = this.currentInstitution;
    return institution?.campusName || 'Institution Name';
  }

  institutionDescription(): string {
    if (this.institutionLoading) {
      return 'Loading institution data...';
    }
    if (this.institutionError) {
      return this.institutionError;
    }
    const institution = this.currentInstitution;
    return (
      institution?.description ||
      'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since'
    );
  }

  institutionImage(): string {
    if (this.institutionError) {
      return 'assets/images/landing-card-institution.png';
    }
    const institution = this.currentInstitution;
    return institution?.imageUrl || institution?.logoUrl || 'assets/images/landing-card-institution.png';
  }

  newsCardTitle(item: LandingAnnouncementItem): string {
    return item.title || 'Title';
  }

  newsDescription(item: LandingAnnouncementItem): string {
    return item.content || 'Lorem Ipsum dummy text...';
  }

  newsImage(item: LandingAnnouncementItem): string {
    return item.imageUrl || 'assets/images/login-news-image.png';
  }

  goToLogin(): void {
    if (this.roles.isAuthenticated()) {
      this.notify.info('You are already logged in. Taking you to your dashboard.');
      void this.router.navigateByUrl(this.roles.getHomeRouteForUser());
      return;
    }
    void this.router.navigate(['/login']);
  }

  goToRegister(): void {
    if (this.roles.isAuthenticated()) {
      this.notify.info('You are already logged in. Taking you to your dashboard.');
      void this.router.navigateByUrl(this.roles.getHomeRouteForUser());
      return;
    }
    void this.router.navigate(['/register']);
  }

  goToRegisterOptions(): void {
    if (this.roles.isAuthenticated()) {
      this.notify.info('You are already logged in. Taking you to your dashboard.');
      void this.router.navigateByUrl(this.roles.getHomeRouteForUser());
      return;
    }
    void this.router.navigate(['/register/options']);
  }
}


