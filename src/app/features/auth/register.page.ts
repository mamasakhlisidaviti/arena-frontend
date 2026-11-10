import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { APP } from '../../core/config/app.constants';
import type { LanguageCode } from '../../core/models/api.model';
import { LanguageService } from '../../core/services/language.service';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';
import { errorTranslationKey, toApiClientError } from '../../core/utils/http-error';
import { AuthState, Register } from '../../state/auth/auth.state';
import { AuthShellComponent } from './auth-shell.component';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  return password === confirmPassword ? null : { mismatch: true };
}

function safeReturnUrl(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/account';
}

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, AuthShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './register.page.html',
})
export class RegisterPage {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);
  private readonly toasts = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly languages = inject(LanguageService);

  readonly loading = this.store.selectSignal(AuthState.loading);
  readonly showPassword = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly languageOptions = APP.languages;

  readonly form = new FormGroup(
    {
      firstName: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(2)],
      }),
      lastName: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(2)],
      }),
      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.email],
      }),
      phone: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.pattern(/^[+0-9()\-\s]{6,20}$/)],
      }),
      password: new FormControl('', {
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
      preferredLanguage: new FormControl<LanguageCode>(this.languages.lang(), {
        nonNullable: true,
      }),
    },
    { validators: [passwordsMatch] },
  );

  readonly returnUrl = safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));

  constructor() {
    this.seo.setPage({
      title: `${this.translate.instant('auth.registerTitle')} — Arena.ge`,
      description: this.translate.instant('auth.registerSubtitle'),
      path: '/register',
      noIndex: true,
    });
  }

  async submit(): Promise<void> {
    this.submitError.set(null);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const raw = this.form.getRawValue();
    try {
      await firstValueFrom(
        this.store.dispatch(
          new Register({
            firstName: raw.firstName.trim(),
            lastName: raw.lastName.trim(),
            email: raw.email.trim().toLowerCase(),
            phone: raw.phone.trim(),
            password: raw.password,
            preferredLanguage: raw.preferredLanguage,
          }),
        ),
      );
      this.toasts.success('auth.registered');
      await this.router.navigateByUrl(this.returnUrl);
    } catch (error) {
      const code = toApiClientError(error).code;
      this.submitError.set(
        code === 'EMAIL_TAKEN' || code === 'EMAIL_EXISTS'
          ? 'auth.emailTaken'
          : errorTranslationKey(error),
      );
    }
  }

  togglePassword(): void {
    this.showPassword.update((visible) => !visible);
  }

  get mismatch(): boolean {
    const confirm = this.form.controls.confirmPassword;
    return Boolean(this.form.hasError('mismatch') && (confirm.touched || confirm.dirty));
  }
}
