import { HttpClient, HttpParams } from '@angular/common/http';
import { isPlatformServer } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { map, type Observable } from 'rxjs';
import { APP } from '../config/app.constants';
import type { ApiEnvelope, PaginationMeta } from '../models/api.model';

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

function toHttpParams(params?: QueryParams): HttpParams | undefined {
  if (!params) {
    return undefined;
  }
  let httpParams = new HttpParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') {
      continue;
    }
    httpParams = httpParams.set(key, String(value));
  }
  return httpParams;
}

function serverApiBase(): string {
  const configured = typeof process !== 'undefined' ? process.env['API_INTERNAL_URL'] : undefined;
  return configured ? `${configured.replace(/\/+$/, '')}/api` : APP.internalApiUrl;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly platform = inject(PLATFORM_ID);

  readonly baseUrl = isPlatformServer(this.platform) ? serverApiBase() : APP.apiBasePath;

  url(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  get<T>(path: string, params?: QueryParams): Observable<T> {
    return this.http
      .get<ApiEnvelope<T>>(this.url(path), { params: toHttpParams(params) })
      .pipe(map((response) => response.data));
  }

  getPage<T>(path: string, params?: QueryParams): Observable<{ data: T; meta: PaginationMeta }> {
    return this.http.get<ApiEnvelope<T>>(this.url(path), { params: toHttpParams(params) }).pipe(
      map((response) => ({
        data: response.data,
        meta: response.meta ?? { page: 1, limit: 0, total: 0, totalPages: 1 },
      })),
    );
  }

  post<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http
      .post<ApiEnvelope<T>>(this.url(path), body)
      .pipe(map((response) => response.data));
  }

  put<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http
      .put<ApiEnvelope<T>>(this.url(path), body)
      .pipe(map((response) => response.data));
  }

  patch<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http
      .patch<ApiEnvelope<T>>(this.url(path), body)
      .pipe(map((response) => response.data));
  }

  delete<T = void>(path: string): Observable<T> {
    return this.http.delete<T>(this.url(path));
  }

  upload<T>(path: string, file: File, folder?: string): Observable<T> {
    const formData = new FormData();
    formData.append('file', file);
    if (folder) {
      formData.append('folder', folder);
    }
    return this.http
      .post<ApiEnvelope<T>>(this.url(path), formData)
      .pipe(map((response) => response.data));
  }

  download(path: string): Observable<Blob> {
    return this.http.get(this.url(path), { responseType: 'blob' });
  }
}
