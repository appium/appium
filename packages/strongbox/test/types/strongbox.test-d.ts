import {expectAssignable, expectNotAssignable} from 'tsd';
import {Item, BaseItem, Value} from '../..';

expectAssignable<Item<string>>(new BaseItem('foo', 'some-container'));

expectNotAssignable<Value>(1);
expectAssignable<Value>('foo');
expectNotAssignable<Value>(true);
expectAssignable<Value>(Buffer.from('foo'));
expectNotAssignable<Value>({});
