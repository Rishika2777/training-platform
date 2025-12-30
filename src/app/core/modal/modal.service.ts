import { Injectable, signal } from '@angular/core';

export type ModalType =
  | 'prospectus-upload'
  | 'companies-visited'
  | 'placed-students'
  | 'courses'
  | 'faculty'
  | 'course-form'
  | 'resume-upload'
  | 'career-checkin'
  | 'learning-pathway'
  | 'dream-job-toolkit'
  | 'ideas-submission'
  | 'company-specialization'
  | 'company-vision-performance'
  | 'company-benefits'
  | 'company-current-vacancy'
  | null;

@Injectable({ providedIn: 'root' })
export class ModalService {
  private readonly activeModalSignal = signal<ModalType>(null);

  readonly activeModal = this.activeModalSignal.asReadonly();

  openModal(type: ModalType): void {
    this.activeModalSignal.set(type);
  }

  closeModal(): void {
    this.activeModalSignal.set(null);
  }
}

