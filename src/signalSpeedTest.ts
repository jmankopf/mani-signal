import {Signal} from './signal';
import {sign} from 'crypto';

const signal = new Signal();

const num = 2_000_000;


let counter = 0;

const callbacks = [];
console.time('create callbacks');
for (let i = 0; i < num; i++) {
    callbacks[i] = () => {
        counter += (i%2);
    };
}
console.timeEnd('create callbacks');


console.time('add callbacks');
for (let i = 0; i < num; i++) {
    signal.add(callbacks[i]);
}
console.timeEnd('add callbacks');


console.time('dispatching');
signal.dispatch();
console.timeEnd('dispatching');

console.log(counter);
