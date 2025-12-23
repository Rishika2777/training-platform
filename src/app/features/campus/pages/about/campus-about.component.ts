import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { CardComponent } from '../../../../shared/components/card/card.component';

@Component({
  selector: 'app-campus-about',
  standalone: true,
  imports: [CommonModule, CardComponent],
  templateUrl: './campus-about.component.html',
  styleUrl: './campus-about.component.css',
})
export class CampusAboutComponent {}


