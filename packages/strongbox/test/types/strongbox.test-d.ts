import { expectAssignable, expectNotAssignable } from 'tsd';
import { BaseItem, Item, strongbox, Value } from '../..';

expectAssignable<Item<string>>(new BaseItem('foo', strongbox('foo')));
expectAssignable<AsyncIterable<Item<any>>>(strongbox('foo'));

expectNotAssignable<Value>(1);
expectAssignable<Value>('foo');
expectNotAssignable<Value>(true);
expectAssignable<Value>(Buffer.from('foo'));
expectNotAssignable<Value>({});
