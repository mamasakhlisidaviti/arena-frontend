import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import type { PlatformSettings } from '../../../core/models/dashboard.model';
import { ApiService } from '../../../core/services/api.service';
import { LanguageService } from '../../../core/services/language.service';
import { PlatformService } from '../../../core/services/platform.service';
import { SeoService } from '../../../core/services/seo.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-admin-settings-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-settings.page.html',
})
export class AdminSettingsPage {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);
  private readonly platform = inject(PlatformService);
  private readonly toasts = inject(ToastService);
  private readonly seo = inject(SeoService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.group({
    siteNameKa: ['', [Validators.maxLength(120)]],
    siteNameEn: ['', [Validators.maxLength(120)]],
    siteNameRu: ['', [Validators.maxLength(120)]],
    taglineKa: ['', [Validators.maxLength(300)]],
    taglineEn: ['', [Validators.maxLength(300)]],
    taglineRu: ['', [Validators.maxLength(300)]],
    contactEmail: ['', [Validators.email, Validators.maxLength(180)]],
    facebook: ['', [Validators.pattern(/^$|^https?:\/\/.+/i), Validators.maxLength(300)]],
    instagram: ['', [Validators.pattern(/^$|^https?:\/\/.+/i), Validators.maxLength(300)]],
    youtube: ['', [Validators.pattern(/^$|^https?:\/\/.+/i), Validators.maxLength(300)]],
  });

  previewName(): string {
    const value = this.form.getRawValue();
    const key =
      this.language.lang() === 'ka'
        ? 'siteNameKa'
        : this.language.lang() === 'ru'
          ? 'siteNameRu'
          : 'siteNameEn';
    return value[key as keyof typeof value]?.trim() || value.siteNameKa?.trim() || 'Arena.ge';
  }

  previewTagline(): string {
    const value = this.form.getRawValue();
    const key =
      this.language.lang() === 'ka'
        ? 'taglineKa'
        : this.language.lang() === 'ru'
          ? 'taglineRu'
          : 'taglineEn';
    return value[key as keyof typeof value]?.trim() || '';
  }

  constructor() {
    this.seo.setPage({
      title: `${this.translate.instant('admin.settingsTitle')} · Arena.ge`,
      noIndex: true,
      path: '/admin/settings',
    });
    this.load();
  }

  // TODO: expose maintenance and notification defaults here once the backend settings schema grows.
  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.get<PlatformSettings>('/settings').subscribe({
      next: (settings) => {
        this.form.reset({
          siteNameKa: settings.siteName?.ka ?? '',
          siteNameEn: settings.siteName?.en ?? '',
          siteNameRu: settings.siteName?.ru ?? '',
          taglineKa: settings.tagline?.ka ?? '',
          taglineEn: settings.tagline?.en ?? '',
          taglineRu: settings.tagline?.ru ?? '',
          contactEmail: settings.contactEmail ?? '',
          facebook: settings.socialLinks?.facebook ?? '',
          instagram: settings.socialLinks?.instagram ?? '',
          youtube: settings.socialLinks?.youtube ?? '',
        });
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('errors.loadFailed');
      },
    });
  }

  save(): void {
    const value = this.form.getRawValue();
    if (![value.siteNameKa, value.siteNameEn, value.siteNameRu].some((name) => Boolean(name?.trim()))) {
      this.toasts.warn('validation.titleRequired');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload: PlatformSettings = {
      siteName: {
        ka: value.siteNameKa?.trim() ?? '',
        en: value.siteNameEn?.trim() ?? '',
        ru: value.siteNameRu?.trim() ?? '',
      },
      tagline: {
        ka: value.taglineKa?.trim() ?? '',
        en: value.taglineEn?.trim() ?? '',
        ru: value.taglineRu?.trim() ?? '',
      },
      contactEmail: value.contactEmail?.trim().toLowerCase() ?? '',
      socialLinks: {
        facebook: value.facebook?.trim() ?? '',
        instagram: value.instagram?.trim() ?? '',
        youtube: value.youtube?.trim() ?? '',
      },
    };

    this.saving.set(true);
    this.api.put<PlatformSettings>('/settings', payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.toasts.success('admin.settingsSaved');
        this.platform.load(true).subscribe({ error: () => undefined });
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.toasts.error(error, 'errors.saveFailed');
      },
    });
  }
}
