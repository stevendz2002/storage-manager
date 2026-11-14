import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideCacheStorage } from 'ngx-storage-manager';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideCacheStorage('ngxsm-showcase-cache'),
  ],
};
