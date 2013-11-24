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
exports.decorate = function(reader) {
	reader.forEach_ = function(_, options, fn, thisObj) {
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

	reader.map_ = function(_, options, fn, thisObj) {
		if (typeof options === "function") thisObj = fn, fn = options, options = 1;
		var par = _parallel(options);
		thisObj = thisObj !== undefined ? thisObj : this;
		var that = this;
		var count = 0;
		return new Decorated(function(_) {
			var val = that.read(_);
			if (val === undefined) return undefined;
			return fn.call(thisObj, _, val, count++);
		});
	};

	reader.filter_ = function(_, options, fn, thisObj) {
		if (typeof options === "function") thisObj = fn, fn = options, options = 1;
		var par = _parallel(options);
		thisObj = thisObj !== undefined ? thisObj : this;
		var that = this;
		return new Decorated(function(_) {
			while (true) {
				var val = that.read(_);
				if (val === undefined) return undefined;
				if (fn.call(thisObj, _, val)) return val;
			}
		});
	};

	reader.every_ = function(_, options, fn, thisObj) {
		if (typeof options === "function") thisObj = fn, fn = options, options = 1;
		var par = _parallel(options);
		thisObj = thisObj !== undefined ? thisObj : this;
		var that = this;
		while (true) {
			var val = that.read(_);
			if (val === undefined) return true;
			if (!fn.call(thisObj, _, val)) return false;
		}
	};

	reader.some_ = function(_, options, fn, thisObj) {
		if (typeof options === "function") thisObj = fn, fn = options, options = 1;
		var par = _parallel(options);
		thisObj = thisObj !== undefined ? thisObj : this;
		var that = this;
		while (true) {
			var val = that.read(_);
			if (val === undefined) return false;
			if (fn.call(thisObj, _, val)) return true;
		}
	};

	reader.reduce_ = function(_, fn, v, thisObj) {
		thisObj = thisObj !== undefined ? thisObj : this;
		var that = this;
		while (true) {
			var val = that.read(_);
			if (val === undefined) return v;
			v = fn.call(thisObj, _, v, val);
		}
	};

	reader.pipe_ = function(_, writer) {
		var that = this;
		do {
			var val = that.read(_);
			writer.write(_, val);
		} while (val !== undefined);
	};

	reader.transform = function(fn) {
		var that = this;
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
				}, that, writer);
			} else {
				bounce(xcb, val)
			}
		}
		return new Decorated(rd);
	}

	return reader;
}

exports.decorate(Decorated.prototype);