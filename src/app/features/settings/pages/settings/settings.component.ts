import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { CardComponent } from '../../../../shared/components/card/card.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, CardComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
})
export class SettingsComponent {
  private readonly route = inject(ActivatedRoute);

  private readonly sectionParam = toSignal(this.route.paramMap.pipe(map((p) => p.get('section'))), {
    initialValue: null,
  });

  readonly section = computed(() => this.sectionParam());
}


