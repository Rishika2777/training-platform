import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PaginationComponent } from '../pagination/pagination.component';

type CarouselType = 'pagination' | 'none';

@Component({
  selector: 'app-carousel',
  standalone: true,
  imports: [CommonModule, PaginationComponent],
  templateUrl: './carousel.component.html',
  styleUrl: './carousel.component.css',
})
export class CarouselComponent {
  @Input() type: CarouselType = 'none';

  @Input() currentPage = 1;
  @Input() totalPages = 1;
  @Input() maxVisible = 6;

  @Output() pageChange = new EventEmitter<number>();
}


