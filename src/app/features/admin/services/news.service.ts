import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { API_ENDPOINTS } from '../../../core/config/app.constants';
import { unwrapApiResponse } from '../../../core/api/api-response.utils';
import { ApiResponse } from '../models/admin-api.models';
import { AdminAuditService } from './admin-audit.service';

export interface NewsResponse {
  id: string;
  title: string;
  description: string;
  createDate: string;
}


@Injectable({ providedIn: 'root' })
export class NewsService {
  private readonly api = inject(ApiService);
  private readonly audit = inject(AdminAuditService);

//   -------------------- post api 
createNews(title: string, description: string): Observable<NewsResponse> {
  return this.api
    .post<ApiResponse<NewsResponse>, { title: string; description: string }>(
      `${API_ENDPOINTS.NEWS.CREATE}?userType=ADMIN`,
      {
        title,
        description
      }
    )

    .pipe(
      tap(() => {
this.audit.logAction('ADMIN_CREATE_NEWS', { title, description });
      }),
      map((response) => unwrapApiResponse<NewsResponse>(response) ?? ({} as NewsResponse))
    );
}

// ------------------ get all news api --------------
 getAllNews(page = 0, size = 20): Observable<NewsResponse[]> {
  return this.api
    .get<ApiResponse<NewsResponse[]>>(
      API_ENDPOINTS.NEWS.BASE,
      {
        page: page,
        size: size
      }
    )
    .pipe(
      map((response) => {
        const data = unwrapApiResponse<NewsResponse[]>(response);
        return Array.isArray(data) ? data : [];
      })
    );
}

// ------------------ get news by id --------------------
getNewsById(newsId: string): Observable<NewsResponse> {
  return this.api
    .get<ApiResponse<NewsResponse>>(
      `${API_ENDPOINTS.NEWS.BASE}/${newsId}`
    )
    .pipe(
      map((response) => unwrapApiResponse<NewsResponse>(response) ?? ({} as NewsResponse))
    );
}


// ---------------------- news update api -------------------
updateNews(newsId: string, title: string, description: string): Observable<NewsResponse> {
  return this.api
  .patch<ApiResponse<NewsResponse>, { title: string; description: string }>(
  `${API_ENDPOINTS.NEWS.BASE}/${newsId}?userType=ADMIN`,
  {
    title,
    description
  }
)

    .pipe(
      tap(() => {
        this.audit.logAction('ADMIN_UPDATE_NEWS', { newsId, title, description });
      }),
      map((response) => unwrapApiResponse<NewsResponse>(response) ?? ({} as NewsResponse))
    );
}



// ------------------------- delete api ---------------------
 deleteNews(newsId: string): Observable<void> {
  return this.api
   .delete<ApiResponse<void>>(
  `${API_ENDPOINTS.NEWS.BASE}/${newsId}?userType=ADMIN`
)

    .pipe(
      tap(() => {
        this.audit.logAction('ADMIN_DELETE_NEWS', { newsId });
      }),
      map(() => void 0)
    );
}

}
