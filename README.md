# mani-signal
a simple and very fast signal class

## Build

```
$ npm install
$ npm run build
```
## Test

```
$ npm run test
```
## Usage
`````````
$ npm install mani-signal --save
```

#### without parameter
```typescript
import {Signal} from 'mani-signal';

const signal = new Signal();

signal.add(()=> {
    console.log('signal callback');
});

signal.dispatch();
```
#### with parameter
```typescript
import {Signal} from 'mani-signal';

const signal = new Signal<string>();

signal.add(param => {
    console.log(`signal callback with ${param}`);
});

signal.dispatch('hello world');
```
#### listen once
```typescript
import {Signal} from 'mani-signal';

const signal = new Signal();

signal.addOnce(() => {
    console.log(`will be called once`);
});

signal.dispatch();
signal.dispatch();

```
#### detach listener

```typescript
import {Signal} from 'mani-signal';

const signal = new Signal();

const binding = signal.add(() => {
    console.log(`won't be called`);
});

binding.detach();

signal.dispatch();
```

#### detach all

```typescript
import {Signal} from 'mani-signal';

const signal = new Signal();

signal.add(() => {
    console.log(`won't be called`);
});
signal.add(() => {
    console.log(`won't be called`);
});

signal.detachAll();

signal.dispatch();
```

