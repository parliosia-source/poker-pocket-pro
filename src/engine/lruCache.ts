/**
 * Simple LRU Cache for equity results.
 * Key: canonical string from heroCards + boardCards sorted.
 */

export class LRUCache<V> {
  private map = new Map<string, V>();
  private maxSize: number;

  constructor(maxSize = 500) {
    this.maxSize = maxSize;
  }

  get(key: string): V | undefined {
    const val = this.map.get(key);
    if (val !== undefined) {
      // Move to end (most recent)
      this.map.delete(key);
      this.map.set(key, val);
    }
    return val;
  }

  set(key: string, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.maxSize) {
      // Delete oldest (first entry)
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, value);
  }

  get size() {
    return this.map.size;
  }

  clear() {
    this.map.clear();
  }
}

/** Build canonical cache key from hero cards + board cards + opponent count */
export function makeEquityKey(heroCards: string[], boardCards: string[], iterations: number, opponentCount = 1): string {
  const h = [...heroCards].sort().join(',');
  const b = [...boardCards].sort().join(',');
  return `${h}|${b}|${iterations}|${opponentCount}`;
}
