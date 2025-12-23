import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONFIG, APP_CONFIG_TOKEN } from '../config/app.constants';

type UrlParams = Readonly<Record<string, string | number>>;

function replaceUrlParams(url: string, params?: UrlParams): string {
  if (!params) {
    return url;
  }
  let result = url;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(`:${key}`, encodeURIComponent(String(value)));
  }
  return result;
}

function buildHttpParams(query?: Readonly<Record<string, string | number | boolean | null | undefined>>): HttpParams {
  if (!query) {
    return new HttpParams();
  }
  let params = new HttpParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined) {
      continue;
    }
    params = params.set(key, String(value));
  }
  return params;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG_TOKEN, { optional: true }) ?? APP_CONFIG;
  private readonly baseUrl = this.config.API_BASE_URL;

  get<T>(
    endpoint: string,
    query?: Readonly<Record<string, string | number | boolean | null | undefined>>,
    urlParams?: UrlParams,
  ): Observable<T> {
    const url = this.baseUrl + replaceUrlParams(endpoint, urlParams);
    return this.http.get<T>(url, { params: buildHttpParams(query) });
  }

  post<TResponse, TBody>(
    endpoint: string,
    body: TBody,
    urlParams?: UrlParams,
  ): Observable<TResponse> {
    const url = this.baseUrl + replaceUrlParams(endpoint, urlParams);
    return this.http.post<TResponse>(url, body);
  }

  put<TResponse, TBody>(
    endpoint: string,
    body: TBody,
    urlParams?: UrlParams,
  ): Observable<TResponse> {
    const url = this.baseUrl + replaceUrlParams(endpoint, urlParams);
    return this.http.put<TResponse>(url, body);
  }

  patch<TResponse, TBody>(
    endpoint: string,
    body: TBody,
    urlParams?: UrlParams,
  ): Observable<TResponse> {
    const url = this.baseUrl + replaceUrlParams(endpoint, urlParams);
    return this.http.patch<TResponse>(url, body);
  }

  delete<TResponse>(endpoint: string, urlParams?: UrlParams): Observable<TResponse> {
    const url = this.baseUrl + replaceUrlParams(endpoint, urlParams);
    return this.http.delete<TResponse>(url);
  }
}


