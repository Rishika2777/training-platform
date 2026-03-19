import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { API_ENDPOINTS } from '../../../core/config/app.constants';
import {
  ApiResponseListCarouselItemResponse,
  ApiResponseListInstitutionResponse,
  ApiResponseListLandingAnnouncement,
  ApiResponseListSearchResultResponse,
} from '../models/landing.models';

@Injectable({ providedIn: 'root' })
export class LandingApiService {
  private readonly api = inject(ApiService);

  /** GET /common/search/autosearch – query min 2 chars. Returns Campus, Student, Company with routeUrl. */
  autosearch(query: string): Observable<ApiResponseListSearchResultResponse> {
    return this.api.get<ApiResponseListSearchResultResponse>(
      API_ENDPOINTS.COMMON.AUTOSEARCH,
      { query: query.trim() },
    );
  }

  getCampusesCarousel(limit = 10): Observable<ApiResponseListCarouselItemResponse> {
    return this.api.get<ApiResponseListCarouselItemResponse>(
      API_ENDPOINTS.CAMPUS.CAMPUSES_CAROUSEL,
      { limit },
    );
  }

  getCompaniesCarousel(limit = 10): Observable<ApiResponseListCarouselItemResponse> {
    return this.api.get<ApiResponseListCarouselItemResponse>(
      API_ENDPOINTS.CAMPUS.COMPANIES_CAROUSEL,
      { limit },
    );
  }

  getInstitutionsRegistered(): Observable<ApiResponseListInstitutionResponse> {
    return this.api.get<ApiResponseListInstitutionResponse>(API_ENDPOINTS.STUDENT.GET_REGISTERED_CAMPUSES);
  }

  getLatestNews(limit = 3): Observable<ApiResponseListLandingAnnouncement> {
    return this.api.get<ApiResponseListLandingAnnouncement>(
      API_ENDPOINTS.CAMPUS.GET_SYNKUP_ANNOUNCEMENTS,
      { limit },
    );
  }
}
