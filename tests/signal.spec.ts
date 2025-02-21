import {Signal, SignalBinding} from '../src/signal';

describe('Signal tests', () => {
    it('should add and dispatch', () => {
        const signal = new Signal();
        let called = false;
        signal.add(() => {
            called = true;
        });

        signal.dispatch();

        expect(called).toBe(true);
    });

    it('should detach', () => {
        const signal = new Signal();
        let called = false;
        const binding = signal.add(() => {
            called = true;
        });

        binding.detach();

        signal.dispatch();

        expect(called).toBe(false);
    });

  it('should detach with AbortController', () => {
    const abortController = new AbortController();
    const signal = new Signal();
    let called = false;
    const binding = signal.add(() => {
      called = true;
    }, {abortSignal: abortController.signal});

    abortController.abort();
    signal.dispatch();

    expect(called).toBe(false);
  });

    it('should detach while dispatching', () => {
        const signal = new Signal();
        let timesCalled = 0;
        const binding = signal.add(() => {
            timesCalled++;
            binding.detach();
        });

        signal.dispatch();
        signal.dispatch();

        expect(timesCalled).toBe(1);
    });

    // NOTE: bindings that detach while signal is dispatching, are removed after the dispatch operation
    it('should detach queued binding after dispatching', () => {
        const signal = new Signal();
        let timesCalled = 0;
        let numErrors = 0;
        let binding1: SignalBinding, binding2: SignalBinding;
        binding1 = signal.add(() => {
            timesCalled++;
            try {
                binding2.detach();
            } catch (e) {
                numErrors++;
            }

        });
        binding2 = signal.add(() => {
            timesCalled++;
        });

        signal.dispatch();
        signal.dispatch();

        expect(timesCalled).toBe(3);
      expect(numErrors).toBe(0);
    });

    it('should detach all', () => {
        const signal = new Signal();
        let timesCalled = 0;
        let error = false;
        let signalBinding = signal.add(() => {
            timesCalled++;
        });
        signal.add(() => {
            timesCalled++;
        });
        signal.add(() => {
            timesCalled++;
        });
        signal.add(() => {
            timesCalled++;
        });
        signal.add(() => {
            timesCalled++;
        });
        signal.add(() => {
            timesCalled++;
        });

        signal.dispatch();
        signal.detachAll();
        try {
            signalBinding.detach();
        } catch (e) {
            error = true;
        }

        signal.dispatch();

        expect(timesCalled).toBe(6);
      expect(error).toBe(false);
    });

    it('should detach all after dispatching when called during dispatch', () => {
        let timesCalled = 0;
        const signal = new Signal();
        signal.add(() => {
            timesCalled++;
            signal.detachAll();
        });
        signal.add(() => {
            timesCalled++;
        });
        signal.add(() => {
            timesCalled++;
        });

        signal.dispatch();
        signal.dispatch();
        expect(timesCalled).toBe(3);
    });

    it('should call with the correct parameter', () => {
        let callParam;
        const signal = new Signal<string>();
        signal.add(param => {
            callParam = param;
        });

        signal.dispatch('param');

        expect(callParam).toBe('param');
    });

    it('should detach multiple bindings (at multiple positions in the linked list) while dispatching', () => {
        let timesCalled = 0;
        const signal = new Signal();
        let binding1 = signal.add(() => {
            timesCalled++;
            binding3.detach();
        });
        let binding2 = signal.add(() => {
            timesCalled++;
            binding4.detach();
        });
        let binding3 = signal.add(() => {
            timesCalled++;
            binding1.detach();
        });
        let binding4 = signal.add(() => {
            timesCalled++;
            binding2.detach();
        });

        signal.dispatch();
        signal.dispatch();

        expect(timesCalled).toBe(4);
    });

    it('should add once', () => {
        let timesCalled = 0;
        const signal = new Signal();
        signal.addOnce(() => {
            timesCalled++;
        });
        signal.add(() => {
            timesCalled++;
        });
        signal.addOnce(() => {
            timesCalled++;
        });
        signal.add(() => {
            timesCalled++;
        });

        signal.dispatch();
        signal.dispatch();
        signal.dispatch();

        expect(timesCalled).toBe(8);
    });

    it('should call with correct context', () => {
        class TestClass {
            signal = new Signal();
            timesCalled = 0;

            constructor() {
              this.signal.add(this.callback, {context: this});
              this.signal.addOnce(this.callback, {context: this});
            }

            callback() {
                this.timesCalled++;
            }
        }

        const t = new TestClass();
        t.signal.dispatch();
        t.signal.dispatch();
        expect(t.timesCalled).toBe(3);
    });

    it('should throw error when running dispatch while dispatching', () => {
        const signal = new Signal();

        signal.add(() => {
            expect(() => {
                signal.dispatch();
            }).toThrow();
        });

        signal.dispatch();
    });

    it('should add listener while dispatching', () => {
        let timesCalled = 0;
        const signal = new Signal();

        signal.add(() => {
            timesCalled++;
            signal.add(() => {
                timesCalled++;
            });
        });

        signal.dispatch();
        signal.dispatch();
        expect(timesCalled).toBe(3);
    });

    it('should add and remove listener while dispatching', () => {
        let timesCalled = 0;
        const signal = new Signal();
        let binding2: SignalBinding;
        signal.add(() => {
            timesCalled++;
            const binding1 = signal.add(() => {
                timesCalled++;
            });
            binding2 = signal.add(() => {
                timesCalled++;
            });
            signal.add(() => {
                timesCalled++;
            });
            binding1.detach();
        });

        signal.dispatch();
        binding2!.detach();
        signal.dispatch();
        expect(timesCalled).toBe(3);
    });

  it('should not throw error when detaching multiple times', () => {
        const signal = new Signal();

        let signalBinding = signal.add(() => {
        });
        let error = false;
        try {
            signalBinding.detach();
            signalBinding.detach();
        } catch (e) {
            error = true;
        }
    expect(error).toBe(false);
    });

    it('should deactivate and reactivate signal binding', () => {
        const signal = new Signal();
        let called = 0;
        const binding = signal.add(() => {
            called++;
        });

        expect(binding.isActive()).toBe(true);
        signal.dispatch();
        expect(called).toBe(1);

        binding.setActive(false);
        expect(binding.isActive()).toBe(false);
        signal.dispatch();
        expect(called).toBe(1);

        binding.setActive(true);
        signal.dispatch();
        expect(binding.isActive()).toBe(true);
        expect(called).toBe(2);
    });

});
