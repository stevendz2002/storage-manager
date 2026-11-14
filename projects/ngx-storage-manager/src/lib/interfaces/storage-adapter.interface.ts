/**
 * Contrato asíncrono compartido para los adaptadores de almacenamiento de la librería.
 *
 * Define las operaciones fundamentales para la persistencia y recuperación de datos
 * serializados en formato JSON.
 */
export interface StorageAdapter {
  /**
   * Almacena o actualiza un valor bajo la clave indicada.
   *
   * @template T Tipo del valor a persistir.
   * @param key Identificador único de la entrada.
   * @param value Valor que se almacenará en formato JSON.
   * @returns Promesa que se resuelve cuando el valor ha sido persistido exitosamente.
   * @throws {Error} Si ocurre un fallo de serialización o de acceso al almacenamiento.
   *
   * @example
   * ```typescript
   * await adapter.set('usuario', { nombre: 'Juan' });
   * ```
   */
  set<T>(key: string, value: T): Promise<void>;

  /**
   * Recupera el valor tipado asociado a la clave dada, o `null` si la clave no existe.
   *
   * @template T Tipo esperado del dato retornado.
   * @param key Identificador de la entrada.
   * @returns Promesa con el valor deserializado o `null` si no existe.
   * @throws {Error} Si el contenido almacenado está corrupto o inaccesible.
   *
   * @example
   * ```typescript
   * const usuario = await adapter.get<{ nombre: string }>('usuario');
   * ```
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Elimina una clave y su valor asociado del almacenamiento.
   *
   * @param key Identificador de la entrada a remover.
   * @returns Promesa que se resuelve al completar la eliminación.
   * @throws {Error} Si ocurre un error en el medio de almacenamiento nativo.
   *
   * @example
   * ```typescript
   * await adapter.remove('usuario');
   * ```
   */
  remove(key: string): Promise<void>;

  /**
   * Comprueba si una clave existe en el almacenamiento, incluyendo valores `null` guardados.
   *
   * @param key Identificador de la entrada a validar.
   * @returns Promesa que resuelve a `true` si la clave existe, `false` en caso contrario.
   * @throws {Error} Si ocurre un error en el medio de almacenamiento nativo.
   *
   * @example
   * ```typescript
   * const existe = await adapter.has('usuario');
   * ```
   */
  has(key: string): Promise<boolean>;

  /**
   * Elimina únicamente los datos gestionados por esta librería en el medio de almacenamiento activo.
   *
   * @returns Promesa que se resuelve cuando se han eliminado los datos administrados.
   * @throws {Error} Si ocurre un error al limpiar el almacenamiento.
   *
   * @example
   * ```typescript
   * await adapter.clear();
   * ```
   */
  clear(): Promise<void>;
}
