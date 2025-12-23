import { Routes } from '@angular/router';
import { CompanyHomeComponent } from './pages/home/company-home.component';
import { CompanyAboutComponent } from './pages/about/company-about.component';
import { CompanySpecializationComponent } from './pages/specialization/company-specialization.component';
import { CompanyVisionPerformanceComponent } from './pages/vision-performance/company-vision-performance.component';
import { CompanyCurrentVacancyComponent } from './pages/current-vacancy/company-current-vacancy.component';
import { CompanyBenefitsComponent } from './pages/benefits/company-benefits.component';

/**
 * Child routes under `/company` (parent route remains in app.routes.ts for guards/layout).
 */
export const companyRoutes: Routes = [
  { path: 'home', component: CompanyHomeComponent },
  { path: 'about', component: CompanyAboutComponent },
  { path: 'specialization', component: CompanySpecializationComponent },
  { path: 'vision-performance', component: CompanyVisionPerformanceComponent },
  { path: 'current-vacancy', component: CompanyCurrentVacancyComponent },
  { path: 'benefits', component: CompanyBenefitsComponent },
];


