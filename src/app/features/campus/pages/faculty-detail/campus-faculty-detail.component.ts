import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface FacultyDetailData {
  name: string;
  imageUrl: string;
  designation: string;
  department: string;
  qualifications: string;
  experience: string;
  email: string;
  phone: string;
}

@Component({
  selector: 'app-campus-faculty-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './campus-faculty-detail.component.html',
  styleUrl: './campus-faculty-detail.component.css',
})
export class CampusFacultyDetailComponent {
  @Input() faculty: FacultyDetailData | null = null;
  @Output() closed = new EventEmitter<void>();

  closeModal(): void {
    this.closed.emit();
  }
}

