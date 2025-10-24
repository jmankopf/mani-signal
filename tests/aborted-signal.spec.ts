import {Signal} from '../src/signal';

describe('Signal with already aborted AbortSignal', () => {
  it('should not call callback when abortSignal is already aborted', () => {
    const signal = new Signal<number>();
    const abortController = new AbortController();

    // Abort the signal before adding the callback
    abortController.abort();

    let callCount = 0;
    const callback = () => {
      callCount++;
    };

    // Add callback with already aborted signal
    signal.add(callback, {abortSignal: abortController.signal});

    // Dispatch the signal
    signal.dispatch(42);

    // Callback should not have been called since signal was already aborted
    expect(callCount).toBe(0);
  });

  it('should not add binding when abortSignal is already aborted', () => {
    const signal = new Signal<string>();
    const abortController = new AbortController();

    abortController.abort();

    const binding = signal.add(() => {}, {abortSignal: abortController.signal});

    // The binding should exist but be detached/inactive
    signal.dispatch('test');

    // Verify binding methods work without errors
    expect(() => binding.detach()).not.toThrow();
  });
});
