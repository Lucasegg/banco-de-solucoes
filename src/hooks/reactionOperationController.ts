export type ReactionOperationResult<T> =
  | { status: 'duplicate' }
  | { status: 'discarded' }
  | { status: 'success'; value: T }
  | { status: 'error'; error: unknown };

/** Synchronous per-key lock whose generation invalidates work from an old session. */
export class ReactionOperationController {
  private generation = 0;
  private readonly operations = new Map<string, symbol>();

  isPending(key: string) { return this.operations.has(key); }
  pendingKeys() { return new Set(this.operations.keys()); }
  reset() { this.generation += 1; this.operations.clear(); }

  async run<T>(key: string, operation: () => Promise<T>): Promise<ReactionOperationResult<T>> {
    if (this.operations.has(key)) return { status: 'duplicate' };
    const token = Symbol(key); const generation = this.generation;
    this.operations.set(key, token);
    try {
      const value = await operation();
      return generation === this.generation && this.operations.get(key) === token ? { status: 'success', value } : { status: 'discarded' };
    } catch (error) {
      return generation === this.generation && this.operations.get(key) === token ? { status: 'error', error } : { status: 'discarded' };
    } finally {
      // Old work must never unlock a newer operation for the same key.
      if (generation === this.generation && this.operations.get(key) === token) this.operations.delete(key);
    }
  }
}
