import { Injectable, inject } from '@angular/core';
import { Observable, map} from 'rxjs';
import { CompanyApiService, ClientResponse, KeyPersonResponse, PreferredCampusResponse, TechnologyResponse, VacancyResponse } from './company-api.service';
import { ImageTile, PersonCard } from '../models/company-home.models';

@Injectable({ providedIn: 'root' })
export class CompanyHomeService {
  private readonly companyApi = inject(CompanyApiService);

  getKeyPeople(companyId: string): Observable<readonly PersonCard[]> {
    return this.companyApi.getKeyPeople(companyId).pipe(
      map((response: readonly KeyPersonResponse[]) =>
        response.map((person) => ({
          name: person.name || 'Name',
          subtitle: person.designation || 'Designation',
          imageUrl: person.photoUrl || 'assets/images/login-news-image.png',
        })),
      ),
    );
  }

    getPreferredCampuses(companyId: string): Observable<readonly ImageTile[]> {
    return this.companyApi.getPreferredCampuses(companyId).pipe(
      map((response: readonly PreferredCampusResponse[]) =>
        response.map((campus, index) => ({
          id: campus.campusId || `campus-${index}`,
            publicCampusId: campus.publicCampusId,  
          imageUrl: resolveImageUrl(campus.campusLogoUrl),
          alt: campus.campusName || 'Preferred campus',
        })),
      ),
    );
  }

  getClients(companyId: string, page: number, size: number): Observable<readonly ImageTile[]> {
    return this.companyApi.getClients(companyId, page, size).pipe(
      map((response: readonly ClientResponse[]) =>
        response.map((client, index) => ({
          id: client.clientId || `client-${index}`,
          imageUrl: resolveImageUrl(client.photoUrl || client.photourl || client.clientLogo || client.logoUrl),
          alt: client.clientName || 'Client',
        })),
      ),
    );
  }

  getSpecializations(companyId: string): Observable<readonly TechnologyResponse[]> {
    return this.companyApi.getSpecializations(companyId);
  }

  getVacancies(companyId: string, page: number, size: number): Observable<readonly VacancyResponse[]> {
    return this.companyApi.getVacancies(companyId, page, size);
  }
}

function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('assets/')) {
    return url;
  }
  if (url.startsWith('/')) {
    return `/api/v1/files${url}`;
  }
  return `/api/v1/files/${url}`;
}
