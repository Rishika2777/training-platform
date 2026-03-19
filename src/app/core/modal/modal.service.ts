import { Injectable, signal } from '@angular/core';

export type ModalType =
  | 'prospectus-upload'
  | 'prospectus-download'
  | 'companies-visited'
  | 'placed-students'
  | 'courses'
  | 'faculty'
  | 'create-post'
  | 'faculty-detail'
  | 'course-form'
  | 'visit-campus'
  | 'resume-upload'
  | 'career-checkin'
  | 'learning-pathway'
  | 'dream-job-toolkit'
  | 'ideas-submission'
  | 'company-specialization'
  | 'company-vision-performance'
  | 'company-benefits'
  | 'company-current-vacancy'
  | 'company-client-form'
  | 'company-preferred-campus-form'
  | 'company-invitation-form'
  | 'batchmates-filter'
  | 'add-department'
  | 'department-detail'
  | 'add-news'
  | 'notice-board'
  | 'notice-detail'
  | 'news-detail'


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

    // 🔹 NOTICE / MODAL DATA PASSING SUPPORT
  // switched to a signal so consumers can reactively depend on it
  private modalDataSignal = signal<unknown>(null);

  setModalData(data: unknown): void {
    this.modalDataSignal.set(data);
  }

  getModalData(): unknown {
    return this.modalDataSignal();
  }

  /** expose the underlying signal for direct subscriptions if needed */
  readonly modalData = this.modalDataSignal.asReadonly();


}

