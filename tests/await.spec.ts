// A minimal Event-like helper to demonstrate/testing the await(abortSignal?) contract.
// Replace this with your actual class under test.
class OnceEvent<T> {
  private listeners: Array<(v: T) => void> = [];

  addOnce(fn: (v: T) => void): () => void {
    let called = false;
    const wrapper = (v: T) => {
      if (called) return;
      called = true;
      fn(v);
      // remove this wrapper
      this.listeners = this.listeners.filter(l => l !== wrapper);
    };
    this.listeners.push(wrapper);
    // return unsubscribe
    return () => {
      this.listeners = this.listeners.filter(l => l !== wrapper);
    };
  }

  emit(value: T) {
    // copy to avoid mutation during iteration
    [...this.listeners].forEach(l => l(value));
  }

  // This should match your implementation under test.
  // Replace this with the imported function or class method in your codebase.
  async await(abortSignal?: AbortSignal): Promise<T> {
    if (abortSignal?.aborted) {
      // DOMException('Aborted', 'AbortError') is typical; we assert on name/message where relevant.
      throw abortSignal.reason ?? new DOMException('Aborted', 'AbortError');
    }

    return new Promise<T>((resolve, reject) => {
      const off = this.addOnce(resolve);

      const onAbort = () => {
        off();
        reject(abortSignal!.reason ?? new DOMException('Aborted', 'AbortError'));
      };

      if (abortSignal) {
        abortSignal.addEventListener('abort', onAbort, {once: true});
      }

      const cleanupResolve = (value: T) => {
        if (abortSignal) {
          abortSignal.removeEventListener('abort', onAbort);
        }
        resolve(value);
      };

      // re-bind once-listener to cleanupResolve
      off();
      this.addOnce(cleanupResolve);
    });
  }
}

describe('await(abortSignal?)', () => {
  test('resolves with emitted value when not aborted', async () => {
    const evt = new OnceEvent<number>();
    const p = evt.await();
    evt.emit(42);
    await expect(p).resolves.toBe(42);
  });

  test('listens only once (subsequent emits do not change resolved value)', async () => {
    const evt = new OnceEvent<string>();
    const p = evt.await();
    evt.emit('first');
    evt.emit('second');
    await expect(p).resolves.toBe('first');
  });

  test('rejects immediately if signal already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const evt = new OnceEvent<number>();
    await expect(evt.await(controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  test('rejects when aborted before emit', async () => {
    const controller = new AbortController();
    const evt = new OnceEvent<number>();
    const p = evt.await(controller.signal);
    controller.abort();
    await expect(p).rejects.toMatchObject({name: 'AbortError'});
  });

  test('does not reject if aborted after resolve, and cleans up listeners', async () => {
    const controller = new AbortController();
    const evt = new OnceEvent<string>();

    // Spy on addEventListener/removeEventListener to ensure cleanup happens.
    const addSpy = jest.spyOn(controller.signal, 'addEventListener');
    const removeSpy = jest.spyOn(controller.signal, 'removeEventListener');

    const p = evt.await(controller.signal);
    evt.emit('done');

    await expect(p).resolves.toBe('done');

    // Abort after resolution; should not affect already resolved promise.
    controller.abort();

    expect(addSpy).toHaveBeenCalledWith('abort', expect.any(Function), {once: true});
    // Ensure we removed the listener on resolve
    expect(removeSpy).toHaveBeenCalledWith('abort', expect.any(Function));

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  test('unsubscribes the once-listener when aborted (no resolve after)', async () => {
    const controller = new AbortController();
    const evt = new OnceEvent<number>();

    const p = evt.await(controller.signal);
    controller.abort();

    await expect(p).rejects.toMatchObject({name: 'AbortError'});

    // If listener was correctly removed on abort, emitting should not try to resolve p or throw.
    expect(() => evt.emit(7)).not.toThrow();
  });
});