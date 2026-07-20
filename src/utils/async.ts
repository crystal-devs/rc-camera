/**
 * 🏗️ Simple concurrency-limited promise runner (p-limit equivalent)
 * Industry standard approach to avoid "thundering herd" issues during batch operations.
 */
export function pLimit(concurrency: number) {
  const queue: Array<() => Promise<any>> = [];
  let activeCount = 0;

  const next = async () => {
    if (activeCount >= concurrency || queue.length === 0) return;

    activeCount++;
    const fn = queue.shift()!;
    try {
      await fn();
    } finally {
      activeCount--;
      next();
    }
  };

  return <T>(fn: () => Promise<T>): Promise<T> => {
    return new Promise((resolve, reject) => {
      queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      // Try to start execution
      next();
    });
  };
}
