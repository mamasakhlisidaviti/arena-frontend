import { HttpClient, type HttpInterceptorFn } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { finalize, map, type Observable, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import type { ApiEnvelope } from '../models/api.model';
import type { AuthSessionResponse } from '../models/user.model';
import { ApiService } from '../services/api.service';
import { SessionStorageService } from '../services/session-storage.service';
import { toApiClientError } from '../utils/http-error';

const RETRY_HEADER = 'X-Arena-Retry';

let refreshInFlight: Observable<string> | null = null;

export const refreshInterceptor: HttpInterceptorFn = (req, next) => {
  const injector = inject(Injector);
  const session = inject(SessionStorageService);
  const isRefreshCall = req.url.includes('/auth/refresh');
  const isCredentialCall = req.url.includes('/auth/login') || req.url.includes('/auth/register');
  const alreadyRetried = req.headers.has(RETRY_HEADER);

  return next(req).pipe(
    catchError((error: unknown) => {
      const apiError = toApiClientError(error);
      if (apiError.status !== 401 || isRefreshCall || isCredentialCall || alreadyRetried) {
        return throwError(() => error);
      }

      const http = injector.get(HttpClient);
      const api = injector.get(ApiService);

      if (!refreshInFlight) {
        refreshInFlight = http
          .post<ApiEnvelope<AuthSessionResponse>>(
            api.url('/auth/refresh'),
            {},
            { withCredentials: true },
          )
          .pipe(
            map((response) => response.data.accessToken),
            tap((token) => session.setAccessToken(token)),
            finalize(() => {
              refreshInFlight = null;
            }),
            shareReplay({ bufferSize: 1, refCount: true }),
          );
      }

      return refreshInFlight.pipe(
        switchMap((token) =>
          next(
            req.clone({
              setHeaders: { Authorization: `Bearer ${token}`, [RETRY_HEADER]: '1' },
            }),
          ),
        ),
        catchError((refreshError: unknown) => {
          session.clear();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
