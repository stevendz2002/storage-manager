import { computed, inject, Injectable, signal } from '@angular/core';
import { StorageManagerService, type StorageBackend } from 'ngx-storage-manager';
import type { LogEntry } from '../models/log-entry.model';
import type { StoredItem } from '../models/stored-item.model';

export type ShowcaseTab = 'playground' | 'demos' | 'inspector' | 'code';

@Injectable({
  providedIn: 'root',
})
export class ShowcaseStorageService {
  private readonly storageManager = inject(StorageManagerService);

  // Active navigation tab
  readonly activeTab = signal<ShowcaseTab>('playground');

  // Form state
  readonly selectedBackend = signal<StorageBackend>('local');
  readonly inputKey = signal<string>('usuario_demo');
  readonly inputValue = signal<string>(
    JSON.stringify(
      {
        id: 1,
        nombre: 'Andrés',
        rol: 'Tech Lead',
        preferencias: { tema: 'blanco', notificaciones: true },
      },
      null,
      2
    )
  );

  // Operation feedback
  readonly lastResult = signal<unknown | null>(null);
  readonly lastStatus = signal<string | null>(null);
  readonly keyExists = signal<boolean | null>(null);
  readonly isOperating = signal<boolean>(false);

  // Logs & Storage items
  readonly logs = signal<LogEntry[]>([]);
  readonly localItems = signal<StoredItem[]>([]);
  readonly cacheItems = signal<string[]>([]);
  readonly cacheSupported = signal<boolean>(false);

  // Counter demo state
  readonly counterValue = signal<number>(0);

  // Computed total items count for badges
  readonly totalStoredCount = computed(
    () => this.localItems().length + this.cacheItems().length
  );

  constructor() {
    this.cacheSupported.set(
      typeof globalThis !== 'undefined' &&
      typeof globalThis.caches !== 'undefined' &&
      globalThis.caches !== null
    );
    this.refreshInspector();
    this.loadCounterDemo();
  }

  setActiveTab(tab: ShowcaseTab): void {
    this.activeTab.set(tab);
    if (tab === 'inspector') {
      this.refreshInspector();
    }
  }

  setBackend(backend: StorageBackend): void {
    this.selectedBackend.set(backend);
    this.checkKeyExists(this.inputKey(), backend);
  }

  setKey(key: string): void {
    this.inputKey.set(key);
    this.checkKeyExists(key, this.selectedBackend());
  }

  setValue(value: string): void {
    this.inputValue.set(value);
  }

  // --- Operations ---

  async handleGet(): Promise<void> {
    const key = this.inputKey().trim();
    if (!key) return;

    const backend = this.selectedBackend();
    const start = performance.now();
    this.isOperating.set(true);

    try {
      const result = await this.storageManager.get<unknown>(backend, key);
      const duration = Math.round((performance.now() - start) * 100) / 100;

      this.lastResult.set(result);
      this.lastStatus.set(result !== null ? 'Valor obtenido con éxito' : 'La clave no existe (retornó null)');
      this.keyExists.set(result !== null);

      this.addLog({
        backend,
        action: 'get',
        key,
        durationMs: duration,
        status: 'success',
        message: result !== null ? 'Valor encontrado' : 'Clave no encontrada (retornó null)',
        data: result,
      });
    } catch (err: unknown) {
      const duration = Math.round((performance.now() - start) * 100) / 100;
      const msg = err instanceof Error ? err.message : String(err);
      this.lastStatus.set(`Error: ${msg}`);
      this.addLog({
        backend,
        action: 'get',
        key,
        durationMs: duration,
        status: 'error',
        message: msg,
      });
    } finally {
      this.isOperating.set(false);
      this.refreshInspector();
    }
  }

  async handleSet(): Promise<void> {
    const key = this.inputKey().trim();
    if (!key) return;

    const backend = this.selectedBackend();
    let parsedValue: unknown;
    try {
      parsedValue = JSON.parse(this.inputValue());
    } catch {
      parsedValue = this.inputValue();
    }

    const start = performance.now();
    this.isOperating.set(true);

    try {
      await this.storageManager.set(backend, key, parsedValue);
      const duration = Math.round((performance.now() - start) * 100) / 100;

      this.lastResult.set(parsedValue);
      this.lastStatus.set(`Guardado correctamente en backend "${backend}"`);
      this.keyExists.set(true);

      this.addLog({
        backend,
        action: 'set',
        key,
        durationMs: duration,
        status: 'success',
        message: 'Guardado exitosamente',
        data: parsedValue,
      });
    } catch (err: unknown) {
      const duration = Math.round((performance.now() - start) * 100) / 100;
      const msg = err instanceof Error ? err.message : String(err);
      this.lastStatus.set(`Error al guardar: ${msg}`);
      this.addLog({
        backend,
        action: 'set',
        key,
        durationMs: duration,
        status: 'error',
        message: msg,
      });
    } finally {
      this.isOperating.set(false);
      this.refreshInspector();
    }
  }

  async handleHas(): Promise<void> {
    const key = this.inputKey().trim();
    if (!key) return;

    const backend = this.selectedBackend();
    const start = performance.now();
    this.isOperating.set(true);

    try {
      const exists = await this.storageManager.has(backend, key);
      const duration = Math.round((performance.now() - start) * 100) / 100;

      this.keyExists.set(exists);
      this.lastStatus.set(exists ? `La clave "${key}" existe` : `La clave "${key}" NO existe`);

      this.addLog({
        backend,
        action: 'has',
        key,
        durationMs: duration,
        status: 'success',
        message: exists ? 'Existe: true' : 'Existe: false',
        data: exists,
      });
    } catch (err: unknown) {
      const duration = Math.round((performance.now() - start) * 100) / 100;
      const msg = err instanceof Error ? err.message : String(err);
      this.lastStatus.set(`Error: ${msg}`);
      this.addLog({
        backend,
        action: 'has',
        key,
        durationMs: duration,
        status: 'error',
        message: msg,
      });
    } finally {
      this.isOperating.set(false);
    }
  }

  async handleRemove(keyToRemove?: string): Promise<void> {
    const key = keyToRemove ?? this.inputKey().trim();
    if (!key) return;

    const backend = this.selectedBackend();
    const start = performance.now();
    this.isOperating.set(true);

    try {
      await this.storageManager.remove(backend, key);
      const duration = Math.round((performance.now() - start) * 100) / 100;

      this.lastStatus.set(`Clave "${key}" eliminada correctamente`);
      this.keyExists.set(false);
      if (this.inputKey() === key) {
        this.lastResult.set(null);
      }

      this.addLog({
        backend,
        action: 'remove',
        key,
        durationMs: duration,
        status: 'success',
        message: 'Eliminado con éxito',
      });
    } catch (err: unknown) {
      const duration = Math.round((performance.now() - start) * 100) / 100;
      const msg = err instanceof Error ? err.message : String(err);
      this.lastStatus.set(`Error al eliminar: ${msg}`);
      this.addLog({
        backend,
        action: 'remove',
        key,
        durationMs: duration,
        status: 'error',
        message: msg,
      });
    } finally {
      this.isOperating.set(false);
      this.refreshInspector();
    }
  }

  async handleClear(backendToClear?: StorageBackend): Promise<void> {
    const backend = backendToClear ?? this.selectedBackend();
    if (!confirm(`¿Deseas limpiar todos los datos gestionados por ngx-storage-manager en ${backend}?`)) {
      return;
    }

    const start = performance.now();
    this.isOperating.set(true);

    try {
      await this.storageManager.clear(backend);
      const duration = Math.round((performance.now() - start) * 100) / 100;

      this.lastStatus.set(`Backend "${backend}" limpiado exitosamente`);
      this.lastResult.set(null);
      this.keyExists.set(false);

      this.addLog({
        backend,
        action: 'clear',
        durationMs: duration,
        status: 'success',
        message: `Clear ejecutado para ${backend}`,
      });
    } catch (err: unknown) {
      const duration = Math.round((performance.now() - start) * 100) / 100;
      const msg = err instanceof Error ? err.message : String(err);
      this.lastStatus.set(`Error al limpiar: ${msg}`);
      this.addLog({
        backend,
        action: 'clear',
        durationMs: duration,
        status: 'error',
        message: msg,
      });
    } finally {
      this.isOperating.set(false);
      this.refreshInspector();
    }
  }

  async checkKeyExists(key: string, backend: StorageBackend): Promise<void> {
    const trimmed = key.trim();
    if (!trimmed) {
      this.keyExists.set(null);
      return;
    }
    try {
      const exists = await this.storageManager.has(backend, trimmed);
      this.keyExists.set(exists);
    } catch {
      this.keyExists.set(null);
    }
  }

  // --- Presets ---

  loadPreset(type: 'user' | 'config' | 'array' | 'string'): void {
    if (type === 'user') {
      this.setKey('perfil_usuario');
      this.setValue(
        JSON.stringify(
          {
            id: 42,
            username: 'dev_andres',
            email: 'andres@example.com',
            permisos: ['read', 'write', 'admin'],
            activo: true,
          },
          null,
          2
        )
      );
    } else if (type === 'config') {
      this.setKey('ajustes_app');
      this.setValue(
        JSON.stringify(
          {
            tema: 'blanco',
            idioma: 'es-CO',
            sidebarColapsada: false,
            itemsPorPagina: 25,
          },
          null,
          2
        )
      );
    } else if (type === 'array') {
      this.setKey('lista_tareas');
      this.setValue(
        JSON.stringify(
          [
            { id: 1, titulo: 'Instalar ngx-storage-manager', completada: true },
            { id: 2, titulo: 'Probar CacheStorage y LocalStorage', completada: true },
            { id: 3, titulo: 'Integrar en producción', completada: false },
          ],
          null,
          2
        )
      );
    } else if (type === 'string') {
      this.setKey('token_sesion');
      this.setValue(JSON.stringify('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'));
    }
  }

  formatJsonInput(): void {
    try {
      const parsed = JSON.parse(this.inputValue());
      this.setValue(JSON.stringify(parsed, null, 2));
    } catch {
      // Not valid JSON, keep as is
    }
  }

  // --- Inspector ---

  async refreshInspector(): Promise<void> {
    if (typeof localStorage !== 'undefined') {
      const items: StoredItem[] = [];
      const prefix = 'ngxsm:';
      for (let i = 0; i < localStorage.length; i++) {
        const fullKey = localStorage.key(i);
        if (fullKey && fullKey.startsWith(prefix)) {
          const raw = localStorage.getItem(fullKey) ?? '';
          let parsed: unknown = undefined;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = raw;
          }
          items.push({
            key: fullKey.substring(prefix.length),
            fullKey,
            value: raw,
            parsed,
          });
        }
      }
      this.localItems.set(items);
    }

    if (this.cacheSupported()) {
      try {
        const cacheNames = await window.caches.keys();
        const relevantCaches = cacheNames.filter(
          (c) => c.includes('ngx-storage-manager') || c.includes('ngxsm')
        );
        const keysFound: string[] = [];
        for (const name of relevantCaches) {
          const cache = await window.caches.open(name);
          const requests = await cache.keys();
          for (const req of requests) {
            const parts = req.url.split('__ngx-storage-manager__/');
            const itemKey = parts.length > 1 ? decodeURIComponent(parts[1]) : req.url;
            keysFound.push(`[${name}] ${itemKey}`);
          }
        }
        this.cacheItems.set(keysFound);
      } catch {
        this.cacheItems.set([]);
      }
    }
  }

  loadItemIntoPlayground(item: StoredItem, backend: StorageBackend = 'local'): void {
    this.selectedBackend.set(backend);
    this.inputKey.set(item.key);
    this.inputValue.set(
      typeof item.parsed === 'object' && item.parsed !== null
        ? JSON.stringify(item.parsed, null, 2)
        : item.value
    );
    this.activeTab.set('playground');
    this.checkKeyExists(item.key, backend);
  }

  // --- Counter Demo ---

  async loadCounterDemo(): Promise<void> {
    try {
      const val = await this.storageManager.get<number>('local', 'showcase_contador');
      this.counterValue.set(typeof val === 'number' ? val : 0);
    } catch {
      this.counterValue.set(0);
    }
  }

  async updateCounter(delta: number): Promise<void> {
    const newVal = this.counterValue() + delta;
    this.counterValue.set(newVal);
    await this.storageManager.set('local', 'showcase_contador', newVal);
    this.addLog({
      backend: 'local',
      action: 'set',
      key: 'showcase_contador',
      durationMs: 1,
      status: 'success',
      message: `Contador actualizado a ${newVal}`,
      data: newVal,
    });
    this.refreshInspector();
  }

  async resetCounter(): Promise<void> {
    this.counterValue.set(0);
    await this.storageManager.set('local', 'showcase_contador', 0);
    this.refreshInspector();
  }

  // --- Logs & Helpers ---

  private addLog(entry: Omit<LogEntry, 'id' | 'timestamp'>): void {
    const newEntry: LogEntry = {
      ...entry,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
    };
    this.logs.update((prev) => [newEntry, ...prev.slice(0, 49)]);
  }

  clearLogs(): void {
    this.logs.set([]);
  }
}
