import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiEnvelope } from '../models/api.model';
import type { AuthSessionResponse, ProfileUpdate, User } from '../models/user.model';
import { ApiService } from './api.service';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  preferredLanguage: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);

  login(payload: LoginPayload): Observable<AuthSessionResponse> {
    return this.api.post<AuthSessionResponse>('/auth/login', payload);
  }

  register(payload: RegisterPayload): Observable<AuthSessionResponse> {
    return this.api.post<AuthSessionResponse>('/auth/register', payload);
  }

  me(): Observable<User> {
    return this.api.get<{ user: User }>('/auth/me').pipe(map((response) => response.user));
  }

  updateProfile(payload: ProfileUpdate): Observable<User> {
    return this.api
      .patch<{ user: User }>('/auth/me', payload)
      .pipe(map((response) => response.user));
  }

  changePassword(payload: ChangePasswordPayload): Observable<{ message: string }> {
    return this.api.post<{ message: string }>('/auth/change-password', payload);
  }

  refresh(): Observable<AuthSessionResponse> {
    return this.http
      .post<ApiEnvelope<AuthSessionResponse>>(this.api.url('/auth/refresh'), {}, { withCredentials: true })
      .pipe(map((response) => response.data));
  }

  logout(): Observable<void> {
    return this.http.post<void>(this.api.url('/auth/logout'), {}, { withCredentials: true });
  }
}
