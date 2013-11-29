"use strict";
/// !doc
/// ## High-level functional stream API
/// 
var flows = require('streamline/lib/util/flows');

function Decorated(read) {
	this.read = read;
};

function defined(val) {
	return val !== undefined;
}

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
	///   Returns the numer of entries that have been piped.
	proto.pipe = function(_, writer) {
		var self = this;
		var count = -1;
		do {
			count++;
			var val = self.read(_);
			writer.write(_, val);
		} while (val !== undefined);
		return count;
	};

	/// * `stream = stream.buffer(count)`  
	///   Bufferizes `count` results by letting `count` read operations progress
	///   in parallel upstream.  
	///   The usual effect is to speed up processing, at the expense of the extra memory used 
	///   to maintain a window of `count` entries in memory. 
	///   Returns another stream on which other operations may be chained.
	proto.buffer = function(count) {
		var self = this;
		var buffered = [];
		return new Decorated(function(_) {
			if (count > 1) {
				while (buffered.length < count) buffered.push(self.read(!_));
				return buffered.shift()(_);
			} else {
				return self.read(_);
			}
		});
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
				var cb = resume;
				resume = xcb;
				if (cb) {
					try {
						cb(null, val);
					} catch (ex) {
						resume(ex);
					}
				}
			};
		var writer = {
			write: function(_, val) {
				bounce(~_, val);
			}
		};

		function f(_, reader, writer) {
			fn.call(thisObj, _, reader, writer);
		}
		var rd = _(function(xcb) {
			if (!resume) {
				resume = xcb;
				f(_ >> function(err, val) {
					if (err) resume(err);
					else bounce(resume); // extra writer.write(_) call to close stream
				}, self, writer);
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

	/// * `result = stream.cut(fn, thisObj)`  
	///   Cuts the stream by when the `fn` condition becomes false.  
	///   This is different from `filter` in that the result streams _ends_ when the condition
	///   becomes false, instead of just skipping the entries. 
	///   The `fn` function is called as `fn(_, elt, i)`.  
	///   Returns another stream on which other operations may be chained.
	proto.cut = function(fn, thisObj) {
		thisObj = thisObj !== undefined ? thisObj : this;
		return this.transform(function(_, reader, writer) {
			for (var i = 0, val;
			(val = reader.read(_)) !== undefined; i++) {
				if (!fn.call(thisObj, _, val, i)) return;
				writer.write(_, val);
			}
		});
	};

	/// * `result = stream.limit(count)`  
	///   Limits the stream to produce `count` results.  
	///   Returns another stream on which other operations may be chained.
	proto.limit = function(n) {
		return this.cut(function(_, val, i) {
			return i < n;
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
	///   `others` may be a single stream or an array of streams.  
	///   `fn` is called as `fn(_, values)` where `values` is the set of values produced by 
	///   all the streams that are still active.  
	///   `fn` returns the value which will be read from the joined stream. `fn` _must_ also reset to `undefined` the `values` entries
	///   that it has consumed. The next `read(_)` on the joined stream will fetch these values. 
	///   Note that the length of the `values` array will decrease every time an input stream is exhausted.
	///   Returns another stream on which other operations may be chained.
	proto.join = function(others, fn, thisObj) {
		var self = this;
		var all = [this];
		if (!Array.isArray(others)) all = all.concat(others);
		else all.push(others);
		var values = [];
		return new Decorated(function(_) {
			var i = 0;
			var advanced = false;
			while (i < all.length) {
				var val;
				if (values[i] === undefined) {
					values[i] = all[i].read(_);
					advanced = true;
					if (values[i] === undefined) {
						all.splice(i, 1);
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

	return proto;
}

exports.decorate(Decorated.prototype);