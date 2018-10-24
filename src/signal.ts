export interface SignalBinding {
    detach(): void;
}

type SignalCallback<T> = (param: T) => void;

interface InternalBinding {
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

export class Signal<T = never> {
    private head?: InternalBinding;
    private tail?: InternalBinding;
    private isDispatching = false;
    private detachAllFlag = false;
    private detachRequests?: DetachRequest;
    private addRequests?: AddRequest;

    add(callback: SignalCallback<T>, context?: any, once?: boolean): SignalBinding {
        let item: InternalBinding = {
            call: once ? (param: T) => {
                callback.call(context, param);
                this.removeBinding(item);
            } : (param: T) => {
                callback.call(context, param);
            }
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

        return {
            detach: () => {
                if (item.isDetached) {
                    throw Error('Binding already detached');
                }
                this.removeBinding(item);
            }
        };
    }

    addOnce(callback: SignalCallback<T>, context?: any) {
        return this.add(callback, context, true);
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
