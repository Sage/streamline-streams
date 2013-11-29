"use strict";

var flows = require('streamline/lib/util/flows');

function Decorated(read) {
	this.read = read;
};

function defined(val) {
	return val !== undefined;
}

exports.decorate = function(proto) {
	proto.forEach = function(_, fn, thisObj) {
		thisObj = thisObj !== undefined ? thisObj : this;
		var val;
		for (var i = 0;
		(val = this.read(_)) !== undefined; i++) {
			fn.call(thisObj, _, val, i);
		}
		this.length = i;
		return this;
	};

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

	proto.every = function(_, fn, thisObj) {
		thisObj = thisObj !== undefined ? thisObj : this;
		var self = this;
		while (true) {
			var val = self.read(_);
			if (val === undefined) return true;
			if (!fn.call(thisObj, _, val)) return false;
		}
	};

	proto.some = function(_, fn, thisObj) {
		thisObj = thisObj !== undefined ? thisObj : this;
		var self = this;
		while (true) {
			var val = self.read(_);
			if (val === undefined) return false;
			if (fn.call(thisObj, _, val)) return true;
		}
	};

	proto.reduce = function(_, fn, v, thisObj) {
		thisObj = thisObj !== undefined ? thisObj : this;
		var self = this;
		while (true) {
			var val = self.read(_);
			if (val === undefined) return v;
			v = fn.call(thisObj, _, v, val);
		}
	};

	proto.pipe = function(_, writer) {
		var self = this;
		do {
			var val = self.read(_);
			writer.write(_, val);
		} while (val !== undefined);
	};

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

	proto.filter = function(fn, thisObj) {
		thisObj = thisObj !== undefined ? thisObj : this;
		return this.transform(function(_, reader, writer) {
			for (var i = 0, val;
			(val = reader.read(_)) !== undefined; i++) {
				if (fn.call(thisObj, _, val, i)) writer.write(_, val);
			}
		});
	};

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

	proto.limit = function(n) {
		return this.cut(function(_, val, i) {
			return i < n;
		});
	};

	proto.skip = function(n) {
		return this.filter(function(_, val, i) {
			return i >= n;
		});
	};

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