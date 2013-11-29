## High-level functional stream API

* `api.decorate(proto)`  
  Adds the high-level API to an object. 
  Usually this object is a prototype but it may be any object with a `read(_)` method.  
  You do not need to call this function if you use streamline wrappers around node.js streams, or streams
  created with `streams.source(readFn)` because the high-level API is already in place.  
  Returns `proto` for convenience.
* `count = stream.forEach(_, fn, thisObj)`  
  Similar to `forEach` on arrays.  
  The `fn` function is called as `fn(_, elt, i)`.  
  This call is asynchonous. It returns the number of entries processed when the end of stream is reached.
* `stream = stream.map(fn, thisObj)`  
  Similar to `map` on arrays.  
  The `fn` function is called as `fn(_, elt, i)`.  
  Returns another stream on which other operations may be chained.
* `result = stream.every(_, fn, thisObj)`  
  Similar to `every` on arrays.  
  The `fn` function is called as `fn(_, elt)`.  
  Returns true at the end of stream if `fn` returned true on every entry.  
  Stops streaming and returns false as soon as `fn` returns false on an entry.
* `result = stream.some(_, fn, thisObj)`  
  Similar to `some` on arrays.  
  The `fn` function is called as `fn(_, elt)`.  
  Returns false at the end of stream if `fn` returned false on every entry.  
  Stops streaming and returns true as soon as `fn` returns true on an entry.
* `result = stream.reduce(_, fn, initial, thisObj)`  
  Similar to `reduce` on arrays.  
  The `fn` function is called as `fn(_, current, elt)` where `current` is `initial` on the first entry and
  the result of the previous `fn` call otherwise.
  Returns the value returned by the last `fn` call.
* `count = stream.pipe(_, writer)`  
  Pipes from `stream` to `writer`.
  Returns the numer of entries that have been piped.
* `stream = stream.buffer(count)`  
  Bufferizes `count` results by letting `count` read operations progress
  in parallel upstream.  
  The usual effect is to speed up processing, at the expense of the extra memory used 
  to maintain a window of `count` entries in memory. 
  Returns another stream on which other operations may be chained.
* `stream = stream.transform(fn)`  
  Inserts an asynchronous transformation into chain.  
  This API is more powerful than `map` because the transformation function can combine results, split them, etc.  
  The transformation function `fn` is called as `fn(_, reader, writer)`
  where `reader` is the `stream` to which `transform` is applied,
  and writer is a writer which is piped into the next element of the chain.  
  Returns another stream on which other operations may be chained.
* `result = stream.filter(fn, thisObj)`  
  Similar to `filter` on arrays.  
  The `fn` function is called as `fn(_, elt, i)`.  
  Returns another stream on which other operations may be chained.
* `result = stream.cut(fn, thisObj)`  
  Cuts the stream by when the `fn` condition becomes false.  
  This is different from `filter` in that the result streams _ends_ when the condition
  becomes false, instead of just skipping the entries. 
  The `fn` function is called as `fn(_, elt, i)`.  
  Returns another stream on which other operations may be chained.
* `result = stream.limit(count)`  
  Limits the stream to produce `count` results.  
  Returns another stream on which other operations may be chained.
* `result = stream.skip(count)`  
  Skips the first `count` entries of the stream.  
  Returns another stream on which other operations may be chained.
* `result = stream.join(others, fn, thisObj)`  
  Joins `stream` with one or more other streams.  
  `others` may be a single stream or an array of streams.  
  `fn` is called as `fn(_, values)` where `values` is the set of values produced by 
  all the streams that are still active.  
  `fn` returns the value which will be read from the joined stream. `fn` _must_ also reset to `undefined` the `values` entries
  that it has consumed. The next `read(_)` on the joined stream will fetch these values. 
  Note that the length of the `values` array will decrease every time an input stream is exhausted.
  Returns another stream on which other operations may be chained.
