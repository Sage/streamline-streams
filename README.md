This module provides _stream wrappers_ for streamline.js. 

## Low-level API

The low-level API provides

* a generic `ReadableStream` wrapper with an asynchronous `stream.read(_[, len])` method.
* a generic `WritableStream` wrapper with an asynchronous `stream.write(_, buf[, encoding])` method.
* wrappers for HTTP and TCP request and response objects (client and server).

See the [low-level API reference](lib/streams.md) for details.

## Array-like API

Readable streams also support a higher level API which is fully aligned on [streamline's asynchronous array API](https://github.com/Sage/streamlinejs/blob/master/lib/compiler/builtins.md). So you can consume streamline streams just like arrays (except that you cannot index them). 

For example, if `stream` is a streamline readable stream wrapper, you can write:

``` javascript
stream.map_(_, function(_, elt) {
	// ...
}).filter_(_, function(_, elt) {
	// ...
}).forEach_(_, function(_, elt) {
	// ...
});
```

Note that these functions return streams rather than arrays, so that you get lazy evaluation through the whole chain.

All the streamline asynchronous array functions are supported except `sort_` and `reduceRight_` because these two functions cannot be implemented without buffering the whole stream.

## Transform and pipe

Two additional functions are provided:

* `stream.transform(fn)`  
  inserts an asynchronous transformation into chain. This API is more powerful than `map_` because the transformation function can combine results, split them, etc. The transformation function `fn` is called as `fn(_, reader, writer)` where `reader` is the `stream` to which `transform` is applied, and writer is a writer which is piped into the next element of the chain.
* `steam.pipe_(_, writer)`  
  pipes from `stream` to `writer`.

The `lib/transform` directory contains standard transforms that you can use with streamline streams:

* `json-transform`: transforms a JSON text stream into a stream of values.

For example, you can read from a JSON file, filter its entries and write the output to another JSON file with:

``` javascript
var streams = require('streamline-streams');
var jsonTrans = require('streamline/streams/lib/transforms/json');

var src = new streams.ReadableStream(fs.createReadStream(srcName), { encoding: 'utf8' });
var dst = new streams.WritableStream(fs.createWriteStream(dstName), { encoding: 'utf8' });

src.transform(jsonTrans.parser()).filter_(_, function(_, elt) {
	return obj.name != null;
}).transform(jsonTrans.formatter({ space: '\t' })).pipe_(_, dst);
```

## More information

The following blog articles give background information on the low-level API design:

* [Asynchronous episode 3 – Adventures in event-land](http://bjouhier.wordpress.com/2011/04/25/asynchronous-episode-3-adventures-in-event-land/)
* [Node.js stream API: events or callbacks?](http://bjouhier.wordpress.com/2012/07/04/node-js-stream-api-events-or-callbacks/)