import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface NoticeDetailData {
  id: string;
  noticeId: string;
  campusId: string;
  departmentId?: string;
  title?: string;        
  message: string;
  createdByType: string;
  createdAt: string;
  updatedAt: string;
  /** UI hint – was the current user allowed to edit/delete when modal was opened */
  editable?: boolean;
}

@Component({
  selector: 'app-campus-notice-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './campus-notice-detail.component.html',
  styleUrl: './campus-notice-detail.component.css',
})
export class CampusNoticeDetailComponent {

  @Input() notice: NoticeDetailData | null = null;
  @Input() readonlyMode = false;
@Output() editRequested = new EventEmitter<NoticeDetailData>();

  @Output() closed = new EventEmitter<void>();
  @Output() deleteRequested = new EventEmitter<string>();

  closeModal(): void {
    this.closed.emit();
  }
  
  onEditClick(): void {
  if (this.notice) {
    this.editRequested.emit(this.notice);
  }
}


  onDeleteClick(): void {
    if (this.notice?.id) {
      this.deleteRequested.emit(this.notice.id);
    }
  }
}
