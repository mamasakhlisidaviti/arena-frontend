import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { PaginationMeta, RegistrationStatus } from '../models/api.model';
import type {
  AppNotification,
  Registration,
  RegistrationCounts,
  RegistrationInput,
} from '../models/registration.model';
import { ApiService, type QueryParams } from './api.service';

export interface RegistrationListResult {
  items: Registration[];
  meta: PaginationMeta;
  counts: RegistrationCounts;
}

@Injectable({ providedIn: 'root' })
export class RegistrationApiService {
  private readonly api = inject(ApiService);

  register(tournamentId: string, payload: RegistrationInput): Observable<Registration> {
    return this.api.post<Registration>(`/tournaments/${tournamentId}/register`, payload);
  }

  addParticipant(tournamentId: string, payload: RegistrationInput): Observable<Registration> {
    return this.api.post<Registration>(`/tournaments/${tournamentId}/registrations`, payload);
  }

  list(
    tournamentId: string,
    params: QueryParams,
  ): Observable<RegistrationListResult> {
    return this.api
      .getPage<Registration[]>(`/tournaments/${tournamentId}/registrations`, params)
      .pipe(
        map(({ data, meta }) => ({
          items: data,
          meta,
          counts: {
            pending: meta.counts?.['pending'] ?? 0,
            approved: meta.counts?.['approved'] ?? 0,
            rejected: meta.counts?.['rejected'] ?? 0,
            cancelled: meta.counts?.['cancelled'] ?? 0,
            waitlisted: meta.counts?.['waitlisted'] ?? 0,
          },
        })),
      );
  }

  get(id: string): Observable<Registration> {
    return this.api.get<Registration>(`/registrations/${id}`);
  }

  updateStatus(
    id: string,
    status: RegistrationStatus,
    notes?: string,
  ): Observable<Registration> {
    return this.api.patch<Registration>(`/registrations/${id}/status`, { status, notes });
  }

  cancel(id: string): Observable<void> {
    return this.api.delete<void>(`/registrations/${id}`);
  }

  myRegistrations(): Observable<Registration[]> {
    return this.api.get<Registration[]>('/registrations/my');
  }

  lookup(number: string, email: string): Observable<Registration> {
    return this.api.get<Registration>('/registrations/lookup', { number, email });
  }

  exportCsv(tournamentId: string, status?: RegistrationStatus): Observable<Blob> {
    const query = status ? `?status=${status}` : '';
    return this.api.download(`/tournaments/${tournamentId}/registrations/export${query}`);
  }

  notifications(): Observable<{ items: AppNotification[]; unread: number }> {
    return this.api.getPage<AppNotification[]>('/notifications').pipe(
      map(({ data, meta }) => ({
        items: data,
        unread: Number((meta as PaginationMeta & { unreadCount?: number }).unreadCount ?? 0),
      })),
    );
  }

  markNotificationRead(id: string): Observable<AppNotification> {
    return this.api.patch<AppNotification>(`/notifications/${id}/read`);
  }

  markAllNotificationsRead(): Observable<void> {
    return this.api.post<void>('/notifications/read-all');
  }
}
