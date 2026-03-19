import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DepartmentDetailService } from '../../services/department-detail.service';
import { ModalService } from '../../../../core/modal/modal.service';
import { CampusApiService, DeleteDepartmentResponse } from '../../services/campus-api.service';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { StorageService } from '../../../../core/storage/storage.service';
import { STORAGE_KEYS } from '../../../../core/config/app.constants';
import { DepartmentDetailData } from '../../services/department-detail.service';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';


@Component({
  selector: 'app-department-detail',
  standalone: true,
  imports: [CommonModule, ModalComponent, ButtonComponent],
  templateUrl: './department-detail.component.html',
  styleUrl: './department-detail.component.css'
})
export class DepartmentDetailComponent {

  private readonly deptService = inject(DepartmentDetailService);
  private readonly modalService = inject(ModalService);
  private readonly campusApi = inject(CampusApiService);
  private readonly notify = inject(NotificationService);
  private readonly storage = inject(StorageService);

  //  department signal (sidebar se aayega)
  readonly department = this.deptService.selectedDepartment;

  showDeleteConfirmModal = false;
  departmentToDelete: DepartmentDetailData | null = null;

  //  modal close
  close(): void {
    this.deptService.clear();        // clear selected state
    this.modalService.closeModal();
  }

  /** Open delete confirmation modal */
  openDeleteConfirm(dept: DepartmentDetailData): void {
    if (!dept?.id) return;
    this.departmentToDelete = dept;
    this.showDeleteConfirmModal = true;
  }

  closeDeleteConfirmModal(): void {
    this.showDeleteConfirmModal = false;
    this.departmentToDelete = null;
  }

  /** Confirm and execute department deletion */
  confirmDeleteDepartment(): void {
    const dept = this.departmentToDelete;
    if (!dept?.id) return;

    const campusEmail = this.getCampusEmail();
    if (!campusEmail) {
      this.notify.error('Campus email not found');
      this.closeDeleteConfirmModal();
      return;
    }

    this.campusApi.deleteDepartment(dept.id, campusEmail).subscribe({
      next: (res: DeleteDepartmentResponse | null) => {
        this.closeDeleteConfirmModal();
        if (res?.success) {
          this.notify.success(res.message || 'Department deleted successfully');
          window.dispatchEvent(new Event('departmentDeleted'));
          this.close();
        } else {
          this.notify.error(res?.message || 'Delete failed');
        }
      },
      error: () => {
        this.closeDeleteConfirmModal();
        this.notify.error('Delete API failed');
      }
    });
  }

  // ----------- EDIT 

 editDepartment(dept: DepartmentDetailData): void {
  this.deptService.setEditingDepartment(dept);
  this.modalService.openModal('add-department');
}




  //  campus email extraction
  private getCampusEmail(): string | null {
    const userData = this.storage.get(STORAGE_KEYS.USER_DATA);

    if (userData && typeof userData === 'object' && 'email' in userData) {
      return (userData as { email?: string }).email || null;
    }

    return null;
  }
}
