"use strict";
/// !doc
/// ## High-level functional stream API
/// 
var streams = require('streamline-streams/lib/streams');
var flows = require('streamline/lib/util/flows');

function Decorated(read) {
	this.read = read;
};

/// * `api.decorate(proto)`  
///   Adds the high-level API to an object. 
///   Usually this object is a prototype but it may be any object with a `read(_)` method.  
///   You do not need to call this function if you use streamline wrappers around node.js streams, or streams
///   created with `streams.source(readFn)` because the high-level API is already in place.  
///   Returns `proto` for convenience.
exports.decorate = function(proto) {
	/// * `count = stream.forEach(_, fn, thisObj)`  
	///   Similar to `forEach` on arrays.  
	///   The `fn` function is called as `fn(_, elt, i)`.  
	///   This call is asynchonous. It returns the number of entries processed when the end of stream is reached.
	proto.forEach = function(_, fn, thisObj) {
		thisObj = thisObj !== undefined ? thisObj : this;
		var val;
		for (var i = 0;
		(val = this.read(_)) !== undefined; i++) {
			fn.call(thisObj, _, val, i);
		}
		return i;
	};

	/// * `stream = stream.map(fn, thisObj)`  
	///   Similar to `map` on arrays.  
	///   The `fn` function is called as `fn(_, elt, i)`.  
	///   Returns another stream on which other operations may be chained.
	proto.map = function(fn, thisObj) {
		thisObj = thisObj !== undefined ? thisObj : this;
		var self = this;
		var count = 0;
		return new Decorated(function(_) {
			var val = self.read(_);
			if (val === undefined) return undefined;
			return fn.call(thisObj, _, val, count++);
		});
	};

	/// * `result = stream.every(_, fn, thisObj)`  
	///   Similar to `every` on arrays.  
	///   The `fn` function is called as `fn(_, elt)`.  
	///   Returns true at the end of stream if `fn` returned true on every entry.  
	///   Stops streaming and returns false as soon as `fn` returns false on an entry.
	proto.every = function(_, fn, thisObj) {
		thisObj = thisObj !== undefined ? thisObj : this;
		var self = this;
		while (true) {
			var val = self.read(_);
			if (val === undefined) return true;
			if (!fn.call(thisObj, _, val)) return false;
		}
	};

	/// * `result = stream.some(_, fn, thisObj)`  
	///   Similar to `some` on arrays.  
	///   The `fn` function is called as `fn(_, elt)`.  
	///   Returns false at the end of stream if `fn` returned false on every entry.  
	///   Stops streaming and returns true as soon as `fn` returns true on an entry.
	proto.some = function(_, fn, thisObj) {
		thisObj = thisObj !== undefined ? thisObj : this;
		var self = this;
		while (true) {
			var val = self.read(_);
			if (val === undefined) return false;
			if (fn.call(thisObj, _, val)) return true;
		}
	};

	/// * `result = stream.reduce(_, fn, initial, thisObj)`  
	///   Similar to `reduce` on arrays.  
	///   The `fn` function is called as `fn(_, current, elt)` where `current` is `initial` on the first entry and
	///   the result of the previous `fn` call otherwise.
	///   Returns the value returned by the last `fn` call.
	proto.reduce = function(_, fn, v, thisObj) {
		thisObj = thisObj !== undefined ? thisObj : this;
		var self = this;
		while (true) {
			var val = self.read(_);
			if (val === undefined) return v;
			v = fn.call(thisObj, _, v, val);
		}
	};

	/// * `count = stream.pipe(_, writer)`  
	///   Pipes from `stream` to `writer`.
	///   Returns the writer for chaining.
	proto.pipe = function(_, writer) {
		var self = this;
		var count = -1;
		do {
			count++;
			var val = self.read(_);
			writer.write(_, val);
		} while (val !== undefined);
		return writer;
	};

	/// * `stream = stream.transform(fn)`  
	///   Inserts an asynchronous transformation into chain.  
	///   This API is more powerful than `map` because the transformation function can combine results, split them, etc.  
	///   The transformation function `fn` is called as `fn(_, reader, writer)`
	///   where `reader` is the `stream` to which `transform` is applied,
	///   and writer is a writer which is piped into the next element of the chain.  
	///   Returns another stream on which other operations may be chained.
	proto.transform = function(fn, thisObj) {
		thisObj = thisObj !== undefined ? thisObj : this;
		var self = this;
		var resume;
		var bounce = function(xcb, val) {
				setImmediate(function() {
					var cb = resume;
					resume = xcb;
					if (cb) {
						try {
							cb(null, val);
						} catch (ex) {
							resume(ex);
						}
					}
				});
			};
		var writer = {
			write: function(_, val) {
				bounce(~_, val);
			}
		};

		function f(_) {
			fn.call(thisObj, _, self, writer);
		}
		var rd = _(function(xcb) {
			if (!resume) {
				resume = xcb;
				f(_ >>
				function(err, val) {
					if (err) resume(err);
					else bounce(xcb); // extra writer.write(_) call to close stream
				});
			} else {
				bounce(xcb)
			}
		}, 0);
		return new Decorated(rd);
	};

	/// * `result = stream.filter(fn, thisObj)`  
	///   Similar to `filter` on arrays.  
	///   The `fn` function is called as `fn(_, elt, i)`.  
	///   Returns another stream on which other operations may be chained.
	proto.filter = function(fn, thisObj) {
		thisObj = thisObj !== undefined ? thisObj : this;
		return this.transform(function(_, reader, writer) {
			for (var i = 0, val;
			(val = reader.read(_)) !== undefined; i++) {
				if (fn.call(thisObj, _, val, i)) writer.write(_, val);
			}
		});
	};

	/// * `result = stream.until(fn, testVal, thisObj)`  
	///   Cuts the stream by when the `fn` condition becomes true.  
	///   The `fn` function is called as `fn(_, elt, i)`.  
	///   Returns another stream on which other operations may be chained.
	proto.until = function(fn, thisObj) {
		thisObj = thisObj !== undefined ? thisObj : this;
		return this.transform(function(_, reader, writer) {
			for (var i = 0, val;
			(val = reader.read(_)) !== undefined; i++) {
				if (fn.call(thisObj, _, val, i)) return;
				writer.write(_, val);
			}
		});
	};

	/// * `result = stream.while(fn, testVal, thisObj)`  
	///   Cuts the stream by when the `fn` condition becomes false.  
	///   This is different from `filter` in that the result streams _ends_ when the condition
	///   becomes false, instead of just skipping the entries.
	///   The `fn` function is called as `fn(_, elt, i)`.  
	///   Returns another stream on which other operations may be chained.
	proto.
	while = function(fn, thisObj) {
		return this.until(function(_, val, i) {
			return !fn.call(thisObj, _, val, i);
		}, thisObj);
	};

	/// * `result = stream.limit(count)`  
	///   Limits the stream to produce `count` results.  
	///   Returns another stream on which other operations may be chained.
	proto.limit = function(n) {
		return this.until(function(_, val, i) {
			return i >= n;
		});
	};

	/// * `result = stream.skip(count)`  
	///   Skips the first `count` entries of the stream.  
	///   Returns another stream on which other operations may be chained.
	proto.skip = function(n) {
		return this.filter(function(_, val, i) {
			return i >= n;
		});
	};

	/// * `result = stream.join(others, fn, thisObj)`  
	///   Joins `stream` with one or more other streams. 
	///   Returns a `StreamGroup` on which other operations can be chained. 
	proto.join = function(others, fn, thisObj) {
		return new StreamGroup(Array.isArray(others) ? [this].concat(others) : [this, others]);
	}

	/// * `group = stream.fork(consumers)`  
	///   Forks the steam and passes the values to a set of consumers, as if each consumer
	///   had its own copy of the stream as input.  
	///   `consumers` is an array of functions with the following signature: `stream = consumer(source)`
	///   Returns a `StreamGroup` on which other operations can be chained.
	proto.fork = function(consumers) {
		var self = this;
		var q = [];
		var position = 0;
		var results = [];
		var next = this.read(!_);
		var limit = consumers.length; // could be configurable
		var done = 0;
		var trace = false;
		var sources = consumers.map(function(consumer) {
			var pos = 0;

			function read(cb) {
				trace && trace("inside read: pos=" + pos + ", position=" + position);
				var i = pos - position;
				var result;
				if (i < 0) throw new Error("invalid state 1 in fork: i=" + i);
				if (i >= 0 && i < results.length) {
					trace && trace("found in results");
					result = results[i];
					if (++result.count === consumers.length) {
						if (i !== 0) throw new Error("invalid state 2 in fork: i=" + i);
						results.shift();
						position++;
					}
					pos++;
					cb(result.err, result.val)
				} else if (results.length < limit) {
					if (next) {
						trace && trace("fetching");
						next(function(err, val) {
							var result = {
								count: done + 1,
								err: err,
								val: val,
							};
							results.push(result);
							var queued;
							while (queued = q.shift()) {
								trace && trace("dequeueing");
								result.count++;
								queued(result.err, result.val);
							}
							if (!result.err && result.val !== undefined) {
								next = self.read(!_);
							} else {
								next = null;
							}
							pos++;
							cb(result.err, result.val);
						});
					} else {
						trace && trace("at end");
						cb(null);
					}
				} else {
					trace && trace("queuing");
					q.push(cb);
				}
			}
			var stream = consumer(new Decorated(function(_) {
				return read(~_);
			}));
			return new Decorated(function(_) {
				var val = stream.read(_);
				trace && trace("end of chain: " + val);
				if (val === undefined) {
					done++;
				}
				return val;
			});
		});
		return new StreamGroup(sources);
	};

	/// * `group = stream.parallel(count, consumer)`  
	///   Parallelizes by distributing the values to a set of  `count` identical consumers.  
	///   `count` is the number of consumers that will be created.  
	///   `consumer` is a function with the following signature: `stream = consumer(source)`  
	///   Returns a `StreamGroup` on which other operations can be chained.  
	///   Note: transformed entries may be delivered out of order.
	proto.parallel = function(count, consumer) {
		var self = this;
		var streams = [];
		for (var i = 0; i < count; i++) {
			(function(i) { // i for debugging
				var funnel = flows.funnel(1);
				streams.push(consumer(new Decorated(function(_) {
					return funnel(_, function(_) {
						return self.read(_);
					});
				})));
			})(i);
		}
		return new StreamGroup(streams).rr();
	};

	return proto;
};

exports.decorate(Decorated.prototype);

/// ## StreamGroup API

function StreamGroup(streams) {
	this.streams = streams;
}

/// * `stream = group.dequeue()`  
///   Dequeues values in the order in which they are delivered by the streams.
///   Returns a stream on which other operations may be chained.
StreamGroup.prototype.dequeue = function() {
	var results = [];
	var err;
	var alive = this.streams.length;
	var resume;
	this.streams.forEach(function(stream, i) {
		var next = function next() {
				stream.read(function(e, v) {
					console.log("DEQUEUE CB: e=" + e + ", v=" + v);
					err = err || e;
					if (e || v === undefined) alive--;
					if (err || v !== undefined || alive === 0) {
						if (resume) {
							var cb = resume;
							resume = null;
							cb(err, v);
						} else {
							results.push({
								e: err,
								v: v,
								next: next,
							});
						}
					}
				});
			};
		next();
	});
	return new Decorated(function(cb) {
		console.log("DEQUEUE READ " + alive);
		if (alive <= 0 || err) return cb(err);
		var res = results.shift();
		if (res) {
			if (res.next) res.next();
			return cb(res.e, res.v);
		} else {
			resume = cb;
		}
	});
}
/// * `stream = group.rr()`  
///   Dequeues values in round robin fashion.
///   Returns a stream on which other operations may be chained.
StreamGroup.prototype.rr = function() {
	function entry(stream, i) {
		return {
			i: i,
			stream: stream,
			read: stream.read(!_),
		};
	}
	var q = this.streams.map(entry);
	return new Decorated(function(_) {
		var elt;
		while (elt = q.shift()) {
			var val = elt.read(_);
			if (val !== undefined) {
				q.push(entry(elt.stream, elt.i));
				return val;
			}
		}
		return undefined;
	});
}

/// * `stream = group.combine(fn, thisObj)`  
///   Combines the values read from the streams to produce a single value.
///   `fn` is called as `fn(_, values)` where `values` is the set of values produced by 
///   all the streams that are still active.  
///   `fn` returns the value which will be read from the joined stream. `fn` _must_ also reset to `undefined` the `values` entries
///   that it has consumed. The next `read(_)` on the joined stream will fetch these values. 
///   Note that the length of the `values` array will decrease every time an input stream is exhausted.
///   Returns a stream on which other operations may be chained.
StreamGroup.prototype.combine = function(fn, thisObj) {
	thisObj = thisObj !== undefined ? thisObj : this;
	var self = this;
	var values = [];
	return new Decorated(function(_) {
		var i = 0;
		var advanced = false;
		while (i < self.streams.length) {
			var val;
			if (values[i] === undefined) {
				values[i] = self.streams[i].read(_);
				advanced = true;
				if (values[i] === undefined) {
					self.streams.splice(i, 1);
					values.splice(i, 1);
				} else {
					i++;
				}
			} else {
				i++;
			}
		}
		if (!advanced) throw new Error("join hook must reset at least one value to undefined");
		if (values.length === 0) return undefined;
		return fn.call(thisObj, _, values);
	});
}

/// 
/// ## Native node.js streams
/// 
exports.decorate(streams.ReadableStream.prototype);

function fixOptions(options) {
	options = options || {};
	options.newApi = true;
	return options;
}

exports.readable = function(emitter, options) {
	return new streams.ReadableStream(emitter, fixOptions(options));
}

exports.writable = function(emitter, options) {
	return new streams.WritableStream(emitter, fixOptions(options));
}

exports.httpServer = function(listener, options) {
	return streams.createHttpServer(listener, fixOptions(options));
}

exports.httpClient = function(options) {
	return streams.httpClient(fixOptions(options));
}

exports.tcpClient = function(port, host, options) {
	return streams.tcpClient(port, host, fixOptions(options));
}

exports.socketClient = function(path, options) {
	return streams.socketClient(path, fixOptions(options));
}

exports.netServer = function(serverOptions, listener, streamOptions) {
	return streams.netServer(serverOptions, listener, fixOptions(streamOptions));
}

/// ## Synthetic stream constructors
/// 
/// * `st = streams.source(read)`  
///   creates a readable stream from a given read(_) function.
exports.source = function(read) {
	return Object.create(exports.empty, {
		read: {
			value: read
		},
	});
}

/// * `st = streams.sink(write)`  
///   creates a writable stream by a given write(_) function.
///   `obj` must have a `write(_)` method
exports.sink = function(write) {
	return Object.create(exports.empty, {
		write: {
			value: write
		},
	});
} /// ## Special streams
/// 
/// * `streams.empty`  
///   The empty stream. `empty.read(_)` returns `undefined`.
///   It is also a null sink. You can write to it but nothing happens
exports.empty = {
	read: function(_) {},
	write: function(_, value) {},
}
exports.decorate(exports.empty);