const locks = new WeakMap<HTMLElement, { count: number; overflow: string }>();

/**
 * Restore the original style only after the last viewer closes.
 */
export const lockBodyScroll = (body: HTMLElement): (() => void) => {
  const lock = locks.get(body) ?? { count: 0, overflow: body.style.overflow };

  lock.count++;
  locks.set(body, lock);

  body.style.overflow = 'hidden';

  return () => {
    if (--lock.count === 0) {
      body.style.overflow = lock.overflow;

      locks.delete(body);
    }
  };
};
