import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { API_ENDPOINTS } from '../../../core/config/app.constants';
import { unwrapApiResponse } from '../../../core/api/api-response.utils';
import type { ApiResponse } from '../models/admin-api.models';
import type {
  UserEngagementResponse,
  SuccessfulPlacementsResponse,
  RegisteredEntitiesResponse,
} from '../models/admin-api.models';

@Injectable({ providedIn: 'root' })
export class AdminDashboardService {
  private readonly api = inject(ApiService);

  getUserEngagement(year?: number): Observable<UserEngagementResponse> {
    const query = year != null ? { year } : undefined;
    return this.api
      .get<ApiResponse<UserEngagementResponse>>(API_ENDPOINTS.ADMIN.DASHBOARD_USER_ENGAGEMENT, query)
      .pipe(
        map((response) => unwrapApiResponse<UserEngagementResponse>(response) ?? { monthlyCounts: [] })
      );
  }

  getSuccessfulPlacements(year?: number): Observable<SuccessfulPlacementsResponse> {
    const query = year != null ? { year } : undefined;
    return this.api
      .get<ApiResponse<SuccessfulPlacementsResponse>>(
        API_ENDPOINTS.ADMIN.DASHBOARD_SUCCESSFUL_PLACEMENTS,
        query
      )
      .pipe(
        map(
          (response) =>
            unwrapApiResponse<SuccessfulPlacementsResponse>(response) ?? { monthlyCounts: [] }
        )
      );
  }

  getRegisteredEntities(year?: number): Observable<RegisteredEntitiesResponse> {
    const query = year != null ? { year } : undefined;
    return this.api
      .get<ApiResponse<RegisteredEntitiesResponse>>(
        API_ENDPOINTS.ADMIN.DASHBOARD_REGISTERED_ENTITIES,
        query
      )
      .pipe(
        map(
          (response) =>
            unwrapApiResponse<RegisteredEntitiesResponse>(response) ?? {
              student: [],
              company: [],
              campus: [],
            }
        )
      );
  }
}
