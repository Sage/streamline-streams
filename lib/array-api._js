"use strict";

function Decorated(read) {
	this.read = read;
};

function _parallel(options) {
	if (typeof options === "number") return options;
	if (typeof options.parallel === "number") return options.parallel;
	return options.parallel ? -1 : 1;
}

// see parallel later
exports.decorate = function(proto) {
	proto.forEach_ = function(_, options, fn, thisObj) {
		if (typeof options === "function") thisObj = fn, fn = options, options = 1;
		var par = _parallel(options);
		thisObj = thisObj !== undefined ? thisObj : this;
		var val;
		for (var i = 0;
		(val = this.read(_)) !== undefined; i++) {
			fn.call(thisObj, _, val, i);
		}
		this.length = i;
		return this;
	};

	proto.map_ = function(_, options, fn, thisObj) {
		if (typeof options === "function") thisObj = fn, fn = options, options = 1;
		var par = _parallel(options);
		thisObj = thisObj !== undefined ? thisObj : this;
		var self = this;
		var count = 0;
		return new Decorated(function(_) {
			var val = self.read(_);
			if (val === undefined) return undefined;
			return fn.call(thisObj, _, val, count++);
		});
	};

	proto.filter_ = function(_, options, fn, thisObj) {
		if (typeof options === "function") thisObj = fn, fn = options, options = 1;
		var par = _parallel(options);
		thisObj = thisObj !== undefined ? thisObj : this;
		var self = this;
		return new Decorated(function(_) {
			while (true) {
				var val = self.read(_);
				if (val === undefined) return undefined;
				if (fn.call(thisObj, _, val)) return val;
			}
		});
	};

	proto.every_ = function(_, options, fn, thisObj) {
		if (typeof options === "function") thisObj = fn, fn = options, options = 1;
		var par = _parallel(options);
		thisObj = thisObj !== undefined ? thisObj : this;
		var self = this;
		while (true) {
			var val = self.read(_);
			if (val === undefined) return true;
			if (!fn.call(thisObj, _, val)) return false;
		}
	};

	proto.some_ = function(_, options, fn, thisObj) {
		if (typeof options === "function") thisObj = fn, fn = options, options = 1;
		var par = _parallel(options);
		thisObj = thisObj !== undefined ? thisObj : this;
		var self = this;
		while (true) {
			var val = self.read(_);
			if (val === undefined) return false;
			if (fn.call(thisObj, _, val)) return true;
		}
	};

	proto.reduce_ = function(_, fn, v, thisObj) {
		thisObj = thisObj !== undefined ? thisObj : this;
		var self = this;
		while (true) {
			var val = self.read(_);
			if (val === undefined) return v;
			v = fn.call(thisObj, _, v, val);
		}
	};

	proto.pipe_ = function(_, writer) {
		var self = this;
		do {
			var val = self.read(_);
			writer.write(_, val);
		} while (val !== undefined);
	};

	proto.transform = function(fn) {
		var self = this;
		var resume;
		var bounce = _(function(xcb, val) {
			var cb = resume;
			resume = xcb;
			if (cb) {
				try {
					cb(null, val);
				} catch (ex) {
					resume(ex);
				}
			}
		}, 0);
		var writer = {
			write: bounce
		};
		var rd = function(xcb, val) {
			if (!resume) {
				resume = xcb;
				fn(_ >> function(err, v) {
					resume(err, v);
				}, self, writer);
			} else {
				bounce(xcb, val)
			}
		}
		return new Decorated(rd);
	}

	return proto;
}

exports.decorate(Decorated.prototype);