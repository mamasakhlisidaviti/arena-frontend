import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { MediaAsset } from '../models/api.model';
import { APP } from '../config/app.constants';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly api = inject(ApiService);

  uploadImage(file: File, folder = APP.uploadFolder): Observable<MediaAsset> {
    return this.api.upload<MediaAsset>('/uploads/image', file, folder);
  }

  deleteImage(publicId: string): Observable<void> {
    return this.api.delete<void>(`/uploads?publicId=${encodeURIComponent(publicId)}`);
  }

  validate(file: File): string | null {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      return 'wizard.imageType';
    }
    if (file.size > APP.maxImageBytes) {
      return 'wizard.imageTooLarge';
    }
    return null;
  }
}
