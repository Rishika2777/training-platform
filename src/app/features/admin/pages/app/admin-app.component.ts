import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { CardComponent } from '../../../../shared/components/card/card.component';

@Component({
  selector: 'app-admin-app',
  standalone: true,
  imports: [CommonModule, CardComponent],
  templateUrl: './admin-app.component.html',
  styleUrl: './admin-app.component.css',
})
export class AdminAppComponent {}


