import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { APP } from '../../core/config/app.constants';
import type { LanguageCode } from '../../core/models/api.model';
import type { AppNotification, Registration } from '../../core/models/registration.model';
import type { User } from '../../core/models/user.model';
import { ConfirmService } from '../../core/services/confirm.service';
import { LanguageService } from '../../core/services/language.service';
import { RegistrationApiService } from '../../core/services/registration-api.service';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';
import { errorTranslationKey, toApiClientError } from '../../core/utils/http-error';
import { localizedValue } from '../../core/utils/localized';
import { UserAvatarComponent } from '../../shared/components/avatar/user-avatar.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { LocalDatePipe } from '../../shared/pipes/localized.pipes';
import {
  AuthState,
  ChangePassword,
  UpdateProfile,
} from '../../state/auth/auth.state';
import { SetLanguage } from '../../state/language/language.state';
import {
  CancelMyRegistration,
  LoadMyRegistrations,
  LoadNotifications,
  MarkAllNotificationsRead,
  MarkNotificationRead,
  RegistrationState,
} from '../../state/registrations/registration.state';

type AccountTab = 'profile' | 'registrations' | 'security' | 'notifications';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  return group.get('newPassword')?.value === group.get('confirmPassword')?.value
    ? null
    : { mismatch: true };
}

@Component({
  selector: 'app-account-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    LocalDatePipe,
    UserAvatarComponent,
    StatusBadgeComponent,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './account.page.html',
})
export class AccountPage {
  private readonly store = inject(Store);
  private readonly seo = inject(SeoService);
  private readonly translate = inject(TranslateService);
  private readonly toasts = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly language = inject(LanguageService);
  private readonly registrationsApi = inject(RegistrationApiService);

  readonly user = this.store.selectSignal(AuthState.user);
  readonly loading = this.store.selectSignal(AuthState.loading);
  readonly registrations = this.store.selectSignal(RegistrationState.myRegistrations);
  readonly registrationsLoading = this.store.selectSignal(RegistrationState.myLoading);
  readonly notifications = this.store.selectSignal(RegistrationState.notifications);
  readonly unread = this.store.selectSignal(RegistrationState.unread);
  readonly notificationsLoading = this.store.selectSignal(RegistrationState.notificationsLoading);

  readonly languageOptions = APP.languages;
  readonly activeTab = signal<AccountTab>('profile');
  readonly savingProfile = signal(false);
  readonly savingPassword = signal(false);
  readonly lookupLoading = signal(false);
  readonly lookupResult = signal<Registration | null>(null);
  readonly lookupError = signal<string | null>(null);

  readonly tabs: { id: AccountTab; labelKey: string; icon: string }[] = [
    { id: 'profile', labelKey: 'account.profile', icon: 'pi pi-user' },
    { id: 'registrations', labelKey: 'account.myRegistrations', icon: 'pi pi-ticket' },
    { id: 'security', labelKey: 'account.security', icon: 'pi pi-lock' },
    { id: 'notifications', labelKey: 'account.notifications', icon: 'pi pi-bell' },
  ];

  readonly profileForm = new FormGroup({
    firstName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    lastName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    phone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[+0-9()\-\s]{6,20}$/)],
    }),
    preferredLanguage: new FormControl<LanguageCode>(this.language.lang(), {
      nonNullable: true,
    }),
  });

  readonly passwordForm = new FormGroup(
    {
      currentPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      newPassword: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/),
        ],
      }),
      confirmPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    { validators: [passwordsMatch] },
  );

  readonly lookupForm = new FormGroup({
    number: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });

  private profileLoaded = false;

  constructor() {
    this.seo.setPage({
      title: `${this.translate.instant('account.title')} — Arena.ge`,
      description: this.translate.instant('account.subtitle'),
      path: '/account',
      noIndex: true,
    });

    this.store.dispatch(new LoadMyRegistrations()).subscribe({ error: () => undefined });
    this.store.dispatch(new LoadNotifications()).subscribe({ error: () => undefined });

    effect(() => {
      const user = this.user();
      if (user && !this.profileLoaded) {
        this.profileForm.patchValue(
          {
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            preferredLanguage: user.preferredLanguage,
          },
          { emitEvent: false },
        );
        this.profileLoaded = true;
      }
    });
  }

  get mismatch(): boolean {
    const confirm = this.passwordForm.controls.confirmPassword;
    return Boolean(
      this.passwordForm.hasError('mismatch') && (confirm.touched || confirm.dirty),
    );
  }

  setTab(tab: AccountTab): void {
    this.activeTab.set(tab);
  }

  async saveProfile(): Promise<void> {
    this.profileForm.markAllAsTouched();
    if (this.profileForm.invalid) {
      return;
    }
    const raw = this.profileForm.getRawValue();
    this.savingProfile.set(true);
    try {
      await firstValueFrom(
        this.store.dispatch(
          new UpdateProfile({
            firstName: raw.firstName.trim(),
            lastName: raw.lastName.trim(),
            phone: raw.phone.trim(),
            preferredLanguage: raw.preferredLanguage,
          }),
        ),
      );
      if (raw.preferredLanguage !== this.language.lang()) {
        this.store.dispatch(new SetLanguage(raw.preferredLanguage));
      }
      this.toasts.success('account.saved');
    } catch (error) {
      this.toasts.error(error);
    } finally {
      this.savingProfile.set(false);
    }
  }

  async savePassword(): Promise<void> {
    this.passwordForm.markAllAsTouched();
    if (this.passwordForm.invalid) {
      return;
    }
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.savingPassword.set(true);
    try {
      await firstValueFrom(
        this.store.dispatch(new ChangePassword({ currentPassword, newPassword })),
      );
      this.passwordForm.reset();
      this.toasts.success('account.passwordChanged');
    } catch (error) {
      this.toasts.error(error);
    } finally {
      this.savingPassword.set(false);
    }
  }

  async cancelRegistration(registration: Registration): Promise<void> {
    const confirmed = await this.confirm.ask({
      headerKey: 'account.confirmCancelTitle',
      messageKey: 'account.confirmCancelText',
      severity: 'danger',
      acceptKey: 'account.cancel',
    });
    if (!confirmed) {
      return;
    }
    try {
      await firstValueFrom(this.store.dispatch(new CancelMyRegistration(registration.id)));
      this.toasts.success('account.cancelled');
    } catch (error) {
      this.toasts.error(error);
    }
  }

  async lookupRegistration(): Promise<void> {
    this.lookupForm.markAllAsTouched();
    if (this.lookupForm.invalid) {
      return;
    }
    const { number, email } = this.lookupForm.getRawValue();
    this.lookupLoading.set(true);
    this.lookupError.set(null);
    this.lookupResult.set(null);
    try {
      const result = await firstValueFrom(
        this.registrationsApi.lookup(number.trim(), email.trim()),
      );
      this.lookupResult.set(result);
    } catch (error) {
      this.lookupError.set(
        toApiClientError(error).isNotFound
          ? 'tournament.lookupNotFound'
          : errorTranslationKey(error),
      );
    } finally {
      this.lookupLoading.set(false);
    }
  }

  async markRead(notification: AppNotification): Promise<void> {
    if (notification.readAt) {
      return;
    }
    try {
      await firstValueFrom(this.store.dispatch(new MarkNotificationRead(notification.id)));
    } catch (error) {
      this.toasts.error(error);
    }
  }

  async markAllRead(): Promise<void> {
    try {
      await firstValueFrom(this.store.dispatch(new MarkAllNotificationsRead()));
      this.toasts.success('account.allRead');
    } catch (error) {
      this.toasts.error(error);
    }
  }

  tournamentOf(registration: Registration): {
    title: string;
    slug: string;
    startDate: string;
  } | null {
    if (typeof registration.tournamentId === 'string') {
      return null;
    }
    const tournament = registration.tournamentId;
    return {
      title: localizedValue(tournament.title, this.language.lang()),
      slug: tournament.slug,
      startDate: tournament.startDate,
    };
  }

  notificationTitle(notification: AppNotification): string {
    return localizedValue(notification.title, this.language.lang());
  }

  notificationMessage(notification: AppNotification): string {
    return localizedValue(notification.message, this.language.lang());
  }

  notificationIcon(type: string): string {
    switch (type) {
      case 'registration_approved':
        return 'pi pi-check-circle';
      case 'registration_rejected':
        return 'pi pi-times-circle';
      case 'registration_waitlisted':
        return 'pi pi-clock';
      case 'registration_cancelled':
        return 'pi pi-ban';
      default:
        return 'pi pi-bell';
    }
  }

  userName(user: User | null): string {
    return user ? `${user.firstName} ${user.lastName}`.trim() : '';
  }
}
