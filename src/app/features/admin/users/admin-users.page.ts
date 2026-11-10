import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Store } from '@ngxs/store';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Dialog } from 'primeng/dialog';
import { Paginator, type PaginatorState } from 'primeng/paginator';
import { Select } from 'primeng/select';
import { APP } from '../../../core/config/app.constants';
import type { PaginationMeta, UserRole } from '../../../core/models/api.model';
import type { User } from '../../../core/models/user.model';
import { ApiService } from '../../../core/services/api.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { LanguageService } from '../../../core/services/language.service';
import { SeoService } from '../../../core/services/seo.service';
import { ToastService } from '../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { AuthState } from '../../../state/auth/auth.state';

interface SelectOption<T> {
  label: string;
  value: T;
}

@Component({
  selector: 'app-admin-users-page',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, Dialog, Select, Paginator, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-users.page.html',
})
export class AdminUsersPage {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);
  private readonly confirm = inject(ConfirmService);
  private readonly toasts = inject(ToastService);
  private readonly seo = inject(SeoService);

  readonly currentUser = this.store.selectSignal(AuthState.user);
  readonly users = signal<User[]>([]);
  readonly meta = signal<PaginationMeta>({ page: 1, limit: APP.adminPageSize, total: 0, totalPages: 1 });
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly dialogOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly deactivatingId = signal<string | null>(null);

  readonly filters = this.fb.group({
    q: [''],
    role: [''],
    isActive: [''],
  });

  readonly form = this.fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(80)]],
    lastName: ['', [Validators.required, Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.maxLength(30)]],
    role: ['admin' as UserRole, [Validators.required]],
    preferredLanguage: ['ka'],
    password: [''],
    isActive: [true],
  });

  readonly roleOptions = computed<SelectOption<UserRole>[]>(() => {
    this.language.lang();
    return [
      { label: this.translate.instant('admin.roleSuperAdmin'), value: 'super_admin' },
      { label: this.translate.instant('admin.roleAdmin'), value: 'admin' },
      { label: this.translate.instant('admin.roleParticipant'), value: 'participant' },
    ];
  });

  readonly filterRoleOptions = computed<SelectOption<string>[]>(() => [
    { label: this.translate.instant('common.all'), value: '' },
    ...this.roleOptions(),
  ]);

  readonly dialogRoleOptions = computed<SelectOption<UserRole>[]>(() =>
    this.editingId()
      ? this.roleOptions()
      : this.roleOptions().filter((option) => option.value !== 'participant'),
  );

  readonly statusOptions = computed<SelectOption<string>[]>(() => {
    this.language.lang();
    return [
      { label: this.translate.instant('common.all'), value: '' },
      { label: this.translate.instant('admin.active'), value: 'true' },
      { label: this.translate.instant('admin.inactive'), value: 'false' },
    ];
  });

  readonly languageOptions = computed<SelectOption<string>[]>(() => {
    this.language.lang();
    return APP.languages.map((code) => ({
      value: code,
      label: this.translate.instant(`language.${code}`),
    }));
  });

  readonly editingUser = computed(() => this.users().find((user) => user.id === this.editingId()) ?? null);
  readonly isEditingSelf = computed(() => this.editingUser()?.id === this.currentUser()?.id);

  readonly dialogTitleKey = computed(() => (this.editingId() ? 'admin.editUser' : 'admin.newUser'));

  constructor() {
    this.seo.setPage({
      title: `${this.translate.instant('admin.usersTitle')} · Arena.ge`,
      noIndex: true,
      path: '/admin/users',
    });

    this.filters.valueChanges
      .pipe(debounceTime(APP.debounceMs), takeUntilDestroyed())
      .subscribe(() => this.load(1));

    this.load(1);
  }

  // TODO: add bulk role updates once the administrators list grows beyond one page.
  load(page = this.meta().page): void {
    const { q, role, isActive } = this.filters.getRawValue();
    this.loading.set(true);
    this.error.set(null);
    this.api
      .getPage<User[]>('/users', {
        page,
        limit: APP.adminPageSize,
        q: q?.trim() || undefined,
        role: role || undefined,
        isActive: isActive || undefined,
      })
      .subscribe({
        next: (response) => {
          this.users.set(response.data);
          this.meta.set(response.meta);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set('errors.loadFailed');
          this.toasts.error(error, 'errors.loadFailed');
        },
      });
  }

  onPage(event: PaginatorState): void {
    if (event.page === undefined || event.page === null) {
      return;
    }
    this.load(event.page + 1);
  }

  clearFilters(): void {
    this.filters.reset({ q: '', role: '', isActive: '' });
  }

  fullName(user: User): string {
    return `${user.firstName} ${user.lastName}`.trim();
  }

  initials(user: User): string {
    const first = user.firstName?.trim().charAt(0) ?? '';
    const last = user.lastName?.trim().charAt(0) ?? '';
    return `${first}${last}`.toUpperCase() || user.email.charAt(0).toUpperCase();
  }

  roleLabel(role: UserRole): string {
    const key =
      role === 'super_admin'
        ? 'admin.roleSuperAdmin'
        : role === 'admin'
          ? 'admin.roleAdmin'
          : 'admin.roleParticipant';
    return this.translate.instant(key);
  }

  roleClass(role: UserRole): string {
    if (role === 'super_admin') {
      return 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300';
    }
    if (role === 'admin') {
      return 'bg-brand-soft text-brand-700 dark:text-brand-200';
    }
    return 'bg-surface-2 text-muted';
  }

  isSelf(user: User): boolean {
    return this.currentUser()?.id === user.id;
  }

  createdLabel(user: User): string {
    return this.formatDate(user.createdAt);
  }

  lastLoginLabel(user: User): string {
    return user.lastLoginAt
      ? this.formatDate(user.lastLoginAt)
      : this.translate.instant('admin.never');
  }

  private formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    const locale = this.language.lang() === 'ka' ? 'ka-GE' : this.language.lang() === 'ru' ? 'ru-RU' : 'en-US';
    return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'admin',
      preferredLanguage: 'ka',
      password: '',
      isActive: true,
    });
    this.form.controls.password.setValidators([
      Validators.required,
      Validators.minLength(8),
      Validators.maxLength(72),
      Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/),
    ]);
    this.form.controls.password.updateValueAndValidity();
    this.form.controls.email.enable();
    this.dialogOpen.set(true);
  }

  openEdit(user: User): void {
    this.editingId.set(user.id);
    this.form.reset({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone ?? '',
      role: user.role,
      preferredLanguage: user.preferredLanguage,
      password: '',
      isActive: user.isActive,
    });
    this.form.controls.password.setValidators([
      Validators.minLength(8),
      Validators.maxLength(72),
      Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/),
    ]);
    this.form.controls.password.updateValueAndValidity();
    this.form.controls.email.disable();
    this.dialogOpen.set(true);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const id = this.editingId();
    const password = value.password?.trim() ?? '';

    this.saving.set(true);
    if (id) {
      const payload: Record<string, unknown> = {
        firstName: value.firstName?.trim(),
        lastName: value.lastName?.trim(),
        phone: value.phone?.trim() ?? '',
        role: value.role,
        preferredLanguage: value.preferredLanguage,
        isActive: Boolean(value.isActive),
      };
      if (password) {
        payload['password'] = password;
      }
      this.api.patch<User>(`/users/${id}`, payload).subscribe({
        next: (updated) => this.afterSave(updated),
        error: (error: unknown) => {
          this.saving.set(false);
          this.toasts.error(error, 'errors.saveFailed');
        },
      });
      return;
    }

    this.api
      .post<User>('/users', {
        firstName: value.firstName?.trim(),
        lastName: value.lastName?.trim(),
        email: value.email?.trim().toLowerCase(),
        phone: value.phone?.trim() ?? '',
        password,
        role: value.role === 'super_admin' ? 'super_admin' : 'admin',
        preferredLanguage: value.preferredLanguage,
      })
      .subscribe({
        next: (created) => this.afterSave(created),
        error: (error: unknown) => {
          this.saving.set(false);
          this.toasts.error(error, 'errors.saveFailed');
        },
      });
  }

  private afterSave(user: User): void {
    this.saving.set(false);
    this.dialogOpen.set(false);
    this.toasts.success('admin.userSaved');
    const index = this.users().findIndex((item) => item.id === user.id);
    if (index >= 0) {
      this.users.update((list) => list.map((item) => (item.id === user.id ? user : item)));
    } else {
      this.load(1);
    }
  }

  // TODO: support reactivating accounts directly from this table instead of only deactivating.
  async deactivate(user: User): Promise<void> {
    if (this.isSelf(user)) {
      return;
    }
    const accepted = await this.confirm.ask({
      headerKey: 'admin.deactivateTitle',
      messageKey: 'admin.deactivateText',
      messageParams: { name: this.fullName(user) },
      acceptKey: 'admin.deactivate',
      severity: 'danger',
    });
    if (!accepted) {
      return;
    }
    this.deactivatingId.set(user.id);
    this.api.delete<void>(`/users/${user.id}`).subscribe({
      next: () => {
        this.deactivatingId.set(null);
        this.users.update((list) =>
          list.map((item) => (item.id === user.id ? { ...item, isActive: false } : item)),
        );
        this.toasts.success('admin.userDeactivated');
      },
      error: (error: unknown) => {
        this.deactivatingId.set(null);
        this.toasts.error(error, 'errors.saveFailed');
      },
    });
  }
}
