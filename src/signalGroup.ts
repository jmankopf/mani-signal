import {Signal, SignalBinding} from './signal';

/**
 * A signal group is a collection of signals that can be disposed all at once.
 * to add a signal to the group, use the add method.
 */
export const signalGroup = () => {
  const disposers: SignalBinding[] = [];
  return {
    /**
     * Adds a signal to the group. The signal will be disposed when the group is disposed.
     * @param signal
     * @param callback
     */
    add: <T extends any>(signal: Signal<T>, callback: (param: T) => void) => {
      disposers.push(
        signal.add(param => {
          callback(param);
        }),
      );
    },
    /**
     * Disposes all signals in the group.
     */
    dispose: () => {
      disposers.forEach(d => d.detach());
    },
    /**
     * Sets the active state of all signals in the group.
     * @param active
     */
    setActive: (active: boolean) => {
      disposers.forEach(d => d.setActive(active));
    },
  };
};