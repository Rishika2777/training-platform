import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-post-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './post-footer.component.html',
  styleUrl: './post-footer.component.css',
})
export class PostFooterComponent {
  @Output() like = new EventEmitter<void>();
  @Output() report = new EventEmitter<void>();
}


