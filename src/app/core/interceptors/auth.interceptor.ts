import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SessionStorageService } from '../services/session-storage.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionStorageService);
  const token = session.accessToken;
  if (!token || req.url.includes('/auth/refresh')) {
    return next(req);
  }
  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
