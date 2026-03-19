import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  signal,
  computed,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  ChangeDetectorRef,
  PLATFORM_ID,
} from '@angular/core';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
  Tooltip,
  Legend,
  type ChartConfiguration,
} from 'chart.js';
import { AdminDashboardService } from '../../services/admin-dashboard.service';
import type {
  UserEngagementResponse,
  SuccessfulPlacementsResponse,
  RegisteredEntitiesResponse,
} from '../../models/admin-api.models';

Chart.register(CategoryScale, LinearScale, BarController, BarElement, Tooltip, Legend);

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function ensure12Months(arr: number[] | undefined): number[] {
  if (!arr || !Array.isArray(arr)) return Array(12).fill(0);
  const copy = [...arr];
  while (copy.length < 12) copy.push(0);
  return copy.slice(0, 12);
}

@Component({
  selector: 'app-admin-app',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-app.component.html',
  styleUrl: './admin-app.component.css',
})
export class AdminAppComponent implements OnInit, OnDestroy, AfterViewChecked {
  private readonly dashboard = inject(AdminDashboardService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  @ViewChild('canvasEngagement') canvasEngagement!: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasPlacements') canvasPlacements!: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasEntities') canvasEntities!: ElementRef<HTMLCanvasElement>;

  private chartEngagement: Chart<'bar'> | null = null;
  private chartPlacements: Chart<'bar'> | null = null;
  private chartEntities: Chart<'bar'> | null = null;
  private chartsDirty = false;

  readonly selectedYear = signal<number>(new Date().getFullYear());
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly userEngagement = signal<UserEngagementResponse | null>(null);
  readonly successfulPlacements = signal<SuccessfulPlacementsResponse | null>(null);
  readonly registeredEntities = signal<RegisteredEntitiesResponse | null>(null);

  readonly engagementMonthly = computed(() =>
    ensure12Months(this.userEngagement()?.yaxisValues ?? this.userEngagement()?.monthlyCounts)
  );
  readonly placementsMonthly = computed(() =>
    ensure12Months(
      this.successfulPlacements()?.yaxisValues ?? this.successfulPlacements()?.monthlyCounts
    )
  );
  readonly entitiesStudent = computed(() =>
    ensure12Months(
      this.registeredEntities()?.studentCounts ?? this.registeredEntities()?.student
    )
  );
  readonly entitiesCompany = computed(() =>
    ensure12Months(
      this.registeredEntities()?.companyCounts ?? this.registeredEntities()?.company
    )
  );
  readonly entitiesCampus = computed(() =>
    ensure12Months(
      this.registeredEntities()?.campusCounts ?? this.registeredEntities()?.campus
    )
  );

  readonly monthLabels = MONTH_LABELS;
  readonly yearOptions = computed(() => {
    const current = new Date().getFullYear();
    return [current, current - 1, current - 2];
  });

  ngOnInit(): void {
    this.loadCharts();
  }

  ngOnDestroy(): void {
    if (this.isBrowser) this.destroyCharts();
  }

  ngAfterViewChecked(): void {
    if (this.chartsDirty && !this.loading() && this.hasData()) {
      this.chartsDirty = false;
      setTimeout(() => this.tryInitCharts(), 0);
    }
  }

  onYearChange(year: number): void {
    this.selectedYear.set(year);
    this.loadCharts();
  }

  loadCharts(): void {
    const isRefresh = this.hasData();
    if (!isRefresh) {
      this.destroyCharts();
    }
    this.loading.set(true);
    this.error.set(null);
    const year = this.selectedYear();

    forkJoin({
      engagement: this.dashboard.getUserEngagement(year),
      placements: this.dashboard.getSuccessfulPlacements(year),
      entities: this.dashboard.getRegisteredEntities(year),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ engagement, placements, entities }) => {
          this.userEngagement.set(engagement);
          this.successfulPlacements.set(placements);
          this.registeredEntities.set(entities);
          this.cdr.detectChanges();
          if (isRefresh && this.chartEngagement && this.chartPlacements && this.chartEntities) {
            this.updateChartsData();
          } else {
            this.chartsDirty = true;
            setTimeout(() => this.tryInitCharts(), 100);
          }
        },
        error: () => this.error.set('Failed to load dashboard data'),
      });
  }

  private tryInitCharts(): void {
    if (!this.isBrowser || !this.hasData() || this.loading()) return;
    this.initCharts();
  }

  hasData(): boolean {
    return (
      this.userEngagement() != null &&
      this.successfulPlacements() != null &&
      this.registeredEntities() != null
    );
  }

  private destroyCharts(): void {
    this.chartEngagement?.destroy();
    this.chartEngagement = null;
    this.chartPlacements?.destroy();
    this.chartPlacements = null;
    this.chartEntities?.destroy();
    this.chartEntities = null;
  }

  private initCharts(): void {
    const eng = this.canvasEngagement?.nativeElement;
    const pl = this.canvasPlacements?.nativeElement;
    const ent = this.canvasEntities?.nativeElement;

    if (eng && !this.chartEngagement) {
      this.chartEngagement = new Chart(eng, this.getEngagementConfig());
    }
    if (pl && !this.chartPlacements) {
      this.chartPlacements = new Chart(pl, this.getPlacementsConfig());
    }
    if (ent && !this.chartEntities) {
      this.chartEntities = new Chart(ent, this.getEntitiesConfig());
    }
  }

  private updateChartsData(): void {
    if (this.chartEngagement) {
      this.chartEngagement.data.datasets[0].data = this.engagementMonthly();
      this.chartEngagement.update('none');
    }
    if (this.chartPlacements) {
      this.chartPlacements.data.datasets[0].data = this.placementsMonthly();
      this.chartPlacements.update('none');
    }
    if (this.chartEntities) {
      this.chartEntities.data.datasets[0].data = this.entitiesStudent();
      this.chartEntities.data.datasets[1].data = this.entitiesCompany();
      this.chartEntities.data.datasets[2].data = this.entitiesCampus();
      this.chartEntities.update('none');
    }
  }

  private getEngagementConfig(): ChartConfiguration<'bar'> {
    const data = this.engagementMonthly();
    return {
      type: 'bar',
      data: {
        labels: MONTH_LABELS,
        datasets: [
          {
            label: 'Registrations',
            data,
            backgroundColor: 'rgba(79, 70, 229, 0.8)',
            borderColor: 'rgb(79, 70, 229)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { mode: 'index', intersect: false },
        },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, ticks: { stepSize: 1 } },
        },
      },
    };
  }

  private getPlacementsConfig(): ChartConfiguration<'bar'> {
    const data = this.placementsMonthly();
    return {
      type: 'bar',
      data: {
        labels: MONTH_LABELS,
        datasets: [
          {
            label: 'Placements',
            data,
            backgroundColor: 'rgba(5, 150, 105, 0.8)',
            borderColor: 'rgb(5, 150, 105)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { mode: 'index', intersect: false },
        },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, ticks: { stepSize: 1 } },
        },
      },
    };
  }

  private getEntitiesConfig(): ChartConfiguration<'bar'> {
    const student = this.entitiesStudent();
    const company = this.entitiesCompany();
    const campus = this.entitiesCampus();
    return {
      type: 'bar',
      data: {
        labels: MONTH_LABELS,
        datasets: [
          { label: 'Student', data: student, backgroundColor: 'rgba(59, 130, 246, 0.8)', borderColor: 'rgb(59, 130, 246)', borderWidth: 1 },
          { label: 'Company', data: company, backgroundColor: 'rgba(245, 158, 11, 0.8)', borderColor: 'rgb(245, 158, 11)', borderWidth: 1 },
          { label: 'Campus', data: campus, backgroundColor: 'rgba(139, 92, 246, 0.8)', borderColor: 'rgb(139, 92, 246)', borderWidth: 1 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          tooltip: { mode: 'index', intersect: false },
        },
        scales: {
          x: { grid: { display: false }, stacked: true },
          y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } },
        },
      },
    };
  }
}
