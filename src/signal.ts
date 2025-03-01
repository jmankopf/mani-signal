export interface SignalBinding {
  setActive(value: boolean): void;
  isActive(): boolean;
  detach(): void;
}

export type SignalCallback<T = unknown> = (param: T) => void;

interface InternalBinding {
  active: boolean;
  isDetached?: boolean;
  next?: InternalBinding;
  prev?: InternalBinding;

  call(param: unknown): void;
}

interface DetachRequest {
  binding: InternalBinding;
  next?: DetachRequest;
}

interface AddRequest {
  binding: InternalBinding;
  next?: DetachRequest;
}
const EMPTY_CALL = () => {};

export type AddSignalOptions = { context?: unknown, once?: boolean, abortSignal?: AbortSignal };

export class Signal<T = unknown> {
  private head?: InternalBinding;
  private tail?: InternalBinding;
  private isDispatching = false;
  private detachAllFlag = false;
  private detachRequests?: DetachRequest;
  private addRequests?: AddRequest;

  await(): Promise<T> {
    return new Promise(resolve => this.addOnce(resolve));
  }

  add(callback: SignalCallback<T>, options: AddSignalOptions = {}): SignalBinding {
    const {context, once, abortSignal} = options;
    const call = once ? (param: T) => {
      callback.call(context, param);
      this.removeBinding(item);
    } : (param: T) => {
      callback.call(context, param);
    };

    let item: InternalBinding = {
      active: true,
      call,
    };

    if (!this.isDispatching) {
      this.doAdd(item);
    } else {
      const addRequest: AddRequest = {binding: item};
      if (this.addRequests) {
        addRequest.next = this.addRequests;
      }
      this.addRequests = addRequest;
    }

    abortSignal?.addEventListener('abort', () => {
      this.removeBinding(item);
    });

    return {
      setActive: (active: boolean) => {
        item.active = active;
        if (active) {
          item.call = call;
        } else {
          item.call = EMPTY_CALL;
        }
      },
      isActive: () => item.active,
      detach: () => {
        if (item.isDetached) return;
        this.removeBinding(item);
      },
    };
  }

  addOnce(callback: SignalCallback<T>, options: Omit<AddSignalOptions, 'once'> = {}) {
    return this.add(callback, {
      ...options,
      once: true,
    });
  }

  dispatch(param?: T): void {
    if (this.isDispatching) {
      throw new Error('Signal.dispatch() was called within the call stack of another dispatch.');
    }
    this.isDispatching = true;
    let current = this.head;
    while (current) {
      current.call(param);
      current = current.next;
    }
    this.isDispatching = false;

    if (this.detachAllFlag) {
      this.detachAllFlag = false;
      this.detachAll();
      this.detachRequests = undefined;
    } else {
      if (this.addRequests) {
        this.processAddRequests();
      }
      if (this.detachRequests) {
        this.processDetachRequests();
      }
    }

  }

  detachAll() {
    if (this.isDispatching) {
      this.detachAllFlag = true;
      return;
    }
    let current = this.head;
    while (current) {
      const temp = current;
      current = current.next;
      temp.call = undefined!;
      temp.isDetached = true;
      temp.prev = temp.next = undefined;
    }
    this.head = this.tail = undefined;
  }

  private doAdd(binding: InternalBinding) {
    if (!this.tail) {
      this.head = this.tail = binding;
    } else {
      this.tail.next = binding;
      binding.prev = this.tail;
      this.tail = binding;
    }
  }

  private processDetachRequests() {
    let current = this.detachRequests;
    while (current) {
      this.doRemoveBinding(current.binding);
      current = current.next;
    }
    this.detachRequests = undefined;
  }

  private processAddRequests() {
    let current = this.addRequests;
    while (current) {
      this.doAdd(current.binding);
      current = current.next;
    }
    this.addRequests = undefined;
  }

  private removeBinding(binding: InternalBinding) {
    binding.isDetached = true;
    if (!this.isDispatching) {
      this.doRemoveBinding(binding);
      return;
    }

    const detachRequest: DetachRequest = {binding};
    if (this.detachRequests) {
      detachRequest.next = this.detachRequests;
    }
    this.detachRequests = detachRequest;
  }

  private doRemoveBinding(binding: InternalBinding) {
    if (!binding.prev) {
      if (!binding.next) {
        // only element
        this.head = this.tail = undefined;
      } else {
        // first element
        this.head = binding.next;
        this.head.prev = undefined;
      }
    } else {
      if (!binding.next) {
        // last element
        this.tail = binding.prev;
        this.tail.next = undefined;
      } else {
        // element in between others
        binding.prev.next = binding.next;
        binding.next.prev = binding.prev;
      }
    }
    binding.prev = binding.next = binding.call = undefined!;
  }
}

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
