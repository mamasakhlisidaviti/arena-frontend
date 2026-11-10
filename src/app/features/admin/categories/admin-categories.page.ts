import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngxs/store';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Dialog } from 'primeng/dialog';
import type { MediaAsset } from '../../../core/models/api.model';
import type {
  CategoryConfiguration,
  CategoryInput,
  GameCategory,
  LocalizedOption,
  RegistrationField,
} from '../../../core/models/category.model';
import { ConfirmService } from '../../../core/services/confirm.service';
import { LanguageService } from '../../../core/services/language.service';
import { SeoService } from '../../../core/services/seo.service';
import { ToastService } from '../../../core/services/toast.service';
import { UploadService } from '../../../core/services/upload.service';
import { toApiClientError } from '../../../core/utils/http-error';
import { localizedValue } from '../../../core/utils/localized';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import {
  CategoryState,
  CreateCategory,
  DeleteCategory,
  LoadAdminCategories,
  UpdateCategory,
} from '../../../state/categories/category.state';

interface EditableOption {
  value: string;
  ka: string;
  en: string;
  ru: string;
}

interface EditableField {
  key: string;
  ka: string;
  en: string;
  ru: string;
  type: RegistrationField['type'];
  required: boolean;
  enabled: boolean;
  optionsText: string;
}

const FIELD_TYPES: RegistrationField['type'][] = ['text', 'email', 'tel', 'number', 'textarea', 'select'];

@Component({
  selector: 'app-admin-categories-page',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, Dialog, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-categories.page.html',
})
export class AdminCategoriesPage {
  private readonly store = inject(Store);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);
  private readonly confirm = inject(ConfirmService);
  private readonly toasts = inject(ToastService);
  private readonly upload = inject(UploadService);
  private readonly seo = inject(SeoService);

  readonly items = this.store.selectSignal(CategoryState.adminItems);
  readonly loading = this.store.selectSignal(CategoryState.adminLoading);

  readonly dialogOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly uploadingImage = signal(false);
  readonly imageError = signal<string | null>(null);
  readonly image = signal<MediaAsset | null>(null);
  readonly types = signal<EditableOption[]>([]);
  readonly formats = signal<EditableOption[]>([]);
  readonly fields = signal<EditableField[]>([]);

  readonly fieldTypes = FIELD_TYPES;

  readonly form = this.fb.group({
    nameKa: [''],
    nameEn: [''],
    nameRu: [''],
    slug: ['', [Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), Validators.maxLength(80)]],
    descriptionKa: [''],
    descriptionEn: [''],
    descriptionRu: [''],
    icon: ['pi pi-flag', [Validators.maxLength(120)]],
    displayOrder: [0, [Validators.min(0), Validators.max(999)]],
    isActive: [true],
  });

  readonly dialogTitleKey = computed(
    () => (this.editingId() ? 'admin.editCategory' : 'admin.newCategory'),
  );

  constructor() {
    this.seo.setPage({
      title: `${this.translate.instant('admin.categoriesTitle')} · Arena.ge`,
      noIndex: true,
      path: '/admin/categories',
    });
    this.store.dispatch(new LoadAdminCategories()).subscribe({ error: () => undefined });
  }

  name(category: GameCategory): string {
    return localizedValue(category.name, this.language.lang()) || category.slug;
  }

  description(category: GameCategory): string {
    return localizedValue(category.description, this.language.lang());
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({
      nameKa: '',
      nameEn: '',
      nameRu: '',
      slug: '',
      descriptionKa: '',
      descriptionEn: '',
      descriptionRu: '',
      icon: 'pi pi-flag',
      displayOrder: this.items().length,
      isActive: true,
    });
    this.types.set([]);
    this.formats.set([]);
    this.fields.set([]);
    this.image.set(null);
    this.imageError.set(null);
    this.dialogOpen.set(true);
  }

  // TODO: keep the original configuration.features/defaults when category editing expands.
  openEdit(category: GameCategory): void {
    this.editingId.set(category.id);
    this.form.reset({
      nameKa: category.name.ka ?? '',
      nameEn: category.name.en ?? '',
      nameRu: category.name.ru ?? '',
      slug: category.slug,
      descriptionKa: category.description?.ka ?? '',
      descriptionEn: category.description?.en ?? '',
      descriptionRu: category.description?.ru ?? '',
      icon: category.icon,
      displayOrder: category.displayOrder,
      isActive: category.isActive,
    });
    this.types.set(
      (category.configuration?.tournamentTypes ?? []).map((option) => this.toEditableOption(option)),
    );
    this.formats.set(
      (category.configuration?.formats ?? []).map((option) => this.toEditableOption(option)),
    );
    this.fields.set((category.registrationFields ?? []).map((field) => this.toEditableField(field)));
    this.image.set(category.image ?? null);
    this.imageError.set(null);
    this.dialogOpen.set(true);
  }

  private toEditableOption(option: LocalizedOption): EditableOption {
    return {
      value: option.value,
      ka: option.label.ka ?? '',
      en: option.label.en ?? '',
      ru: option.label.ru ?? '',
    };
  }

  private toEditableField(field: RegistrationField): EditableField {
    return {
      key: field.key,
      ka: field.label.ka ?? '',
      en: field.label.en ?? '',
      ru: field.label.ru ?? '',
      type: field.type,
      required: field.required,
      enabled: field.enabled,
      optionsText: (field.options ?? []).join(', '),
    };
  }

  addOption(kind: 'types' | 'formats'): void {
    const blank: EditableOption = { value: '', ka: '', en: '', ru: '' };
    if (kind === 'types') {
      this.types.update((list) => [...list, blank]);
    } else {
      this.formats.update((list) => [...list, blank]);
    }
  }

  removeOption(kind: 'types' | 'formats', index: number): void {
    if (kind === 'types') {
      this.types.update((list) => list.filter((_, cursor) => cursor !== index));
    } else {
      this.formats.update((list) => list.filter((_, cursor) => cursor !== index));
    }
  }

  updateOption(kind: 'types' | 'formats', index: number, field: keyof EditableOption, event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const value = field === 'value' ? raw.toLowerCase().replace(/[^a-z0-9_]/g, '').replace(/\s+/g, '_') : raw;
    const update = (list: EditableOption[]) =>
      list.map((item, cursor) => (cursor === index ? { ...item, [field]: value } : item));
    if (kind === 'types') {
      this.types.update(update);
    } else {
      this.formats.update(update);
    }
  }

  addField(): void {
    this.fields.update((list) => [
      ...list,
      { key: '', ka: '', en: '', ru: '', type: 'text', required: false, enabled: true, optionsText: '' },
    ]);
  }

  removeField(index: number): void {
    this.fields.update((list) => list.filter((_, cursor) => cursor !== index));
  }

  updateField(index: number, patch: Partial<EditableField>): void {
    if (patch.key !== undefined) {
      patch = { ...patch, key: patch.key.replace(/[^a-zA-Z0-9_]/g, '') };
    }
    this.fields.update((list) =>
      list.map((item, cursor) => (cursor === index ? { ...item, ...patch } : item)),
    );
  }

  onFieldInput(index: number, field: keyof EditableField, event: Event): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    this.updateField(index, { [field]: target.value } as Partial<EditableField>);
  }

  onFieldTypeChange(index: number, event: Event): void {
    const type = (event.target as HTMLSelectElement).value as RegistrationField['type'];
    this.updateField(index, { type });
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    const validation = this.upload.validate(file);
    if (validation) {
      this.imageError.set(validation);
      return;
    }
    this.imageError.set(null);
    this.uploadingImage.set(true);
    this.upload.uploadImage(file, 'categories').subscribe({
      next: (asset) => {
        this.image.set(asset);
        this.uploadingImage.set(false);
      },
      error: () => {
        this.imageError.set('wizard.uploadFailed');
        this.uploadingImage.set(false);
      },
    });
  }

  removeImage(): void {
    this.image.set(null);
  }

  // TODO: warn before shrinking participant options that existing tournaments still reference.
  save(): void {
    const value = this.form.getRawValue();
    if (![value.nameKa, value.nameEn, value.nameRu].some((name) => Boolean(name?.trim()))) {
      this.toasts.warn('validation.required');
      return;
    }
    const configuration: CategoryConfiguration = {
      tournamentTypes: this.collectOptions(this.types()),
      formats: this.collectOptions(this.formats()),
      features: {},
      defaults: {},
    };
    const existing = this.items().find((category) => category.id === this.editingId());
    configuration.features = existing?.configuration?.features ?? {};
    configuration.defaults = existing?.configuration?.defaults ?? {};

    const payload: CategoryInput = {
      name: {
        ka: value.nameKa?.trim() ?? '',
        en: value.nameEn?.trim() ?? '',
        ru: value.nameRu?.trim() ?? '',
      },
      slug: value.slug?.trim() || undefined,
      description: {
        ka: value.descriptionKa?.trim() ?? '',
        en: value.descriptionEn?.trim() ?? '',
        ru: value.descriptionRu?.trim() ?? '',
      },
      icon: value.icon?.trim() || 'pi pi-flag',
      image: this.image(),
      isActive: Boolean(value.isActive),
      displayOrder: Number(value.displayOrder ?? 0),
      configuration,
      registrationFields: this.collectFields(),
    };

    this.saving.set(true);
    const id = this.editingId();
    const action = id ? new UpdateCategory(id, payload) : new CreateCategory(payload);
    this.store.dispatch(action).subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogOpen.set(false);
        this.toasts.success('admin.categorySaved');
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.toasts.error(error, 'errors.saveFailed');
      },
    });
  }

  private collectOptions(options: EditableOption[]): LocalizedOption[] {
    return options
      .filter((option) => Boolean(option.value.trim()))
      .map((option) => ({
        value: option.value.trim(),
        label: {
          ka: option.ka.trim() || option.value,
          en: option.en.trim() || option.value,
          ru: option.ru.trim() || option.value,
        },
      }));
  }

  private collectFields(): RegistrationField[] {
    return this.fields()
      .filter((field) => Boolean(field.key.trim()))
      .map((field) => ({
        key: field.key.trim(),
        label: {
          ka: field.ka.trim() || field.key,
          en: field.en.trim() || field.key,
          ru: field.ru.trim() || field.key,
        },
        type: field.type,
        required: field.required,
        enabled: field.enabled,
        options:
          field.type === 'select'
            ? field.optionsText
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean)
            : [],
      }));
  }

  async remove(category: GameCategory): Promise<void> {
    const accepted = await this.confirm.ask({
      headerKey: 'admin.deleteTitle',
      messageKey: 'admin.deleteText',
      acceptKey: 'common.delete',
      severity: 'danger',
    });
    if (!accepted) {
      return;
    }
    this.store.dispatch(new DeleteCategory(category.id)).subscribe({
      next: () => this.toasts.success('admin.categoryDeleted'),
      error: (error: unknown) => {
        if (toApiClientError(error).code === 'CATEGORY_IN_USE') {
          this.toasts.warn('admin.categoryInUse');
        } else {
          this.toasts.error(error, 'errors.saveFailed');
        }
      },
    });
  }
}
