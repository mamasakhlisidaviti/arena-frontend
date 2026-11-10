import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';
import { errorTranslationKey, toApiClientError } from '../../core/utils/http-error';
import { AuthState, Login } from '../../state/auth/auth.state';
import { AuthShellComponent } from './auth-shell.component';

function safeReturnUrl(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/account';
}

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, AuthShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.page.html',
})
export class LoginPage {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);
  private readonly toasts = inject(ToastService);
  private readonly translate = inject(TranslateService);

  readonly loading = this.store.selectSignal(AuthState.loading);
  readonly showPassword = signal(false);
  readonly submitError = signal<string | null>(null);

  readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  readonly returnUrl = safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));

  constructor() {
    this.seo.setPage({
      title: `${this.translate.instant('auth.loginTitle')} — Arena.ge`,
      description: this.translate.instant('auth.loginSubtitle'),
      path: '/login',
      noIndex: true,
    });
  }

  async submit(): Promise<void> {
    this.submitError.set(null);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const { email, password } = this.form.getRawValue();
    try {
      await firstValueFrom(
        this.store.dispatch(
          new Login({ email: email.trim().toLowerCase(), password }),
        ),
      );
      this.toasts.success('auth.welcomeBack');
      await this.router.navigateByUrl(this.returnUrl);
    } catch (error) {
      const apiError = toApiClientError(error);
      if (apiError.status === 401) {
        this.submitError.set('auth.invalidCredentials');
      } else {
        this.submitError.set(errorTranslationKey(error));
      }
    }
  }

  togglePassword(): void {
    this.showPassword.update((visible) => !visible);
  }
}
