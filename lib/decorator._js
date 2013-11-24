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
		(val = reader.read(_)) !== undefined; i++) {
			fn.call(thisObj, _, val, i);
		}
		thisObj.length = i;
		return thisObj;
	};

	reader.map_ = function(_, options, fn, thisObj) {
		if (typeof options === "function") thisObj = fn, fn = options, options = 1;
		var par = _parallel(options);
		thisObj = thisObj !== undefined ? thisObj : this;
		var count = 0;
		return new Decorated(function(_) {
			var val = reader.read(_);
			if (val === undefined) return undefined;
			return fn.call(thisObj, _, val, count++);
		});
	};

	reader.filter_ = function(_, options, fn, thisObj) {
		if (typeof options === "function") thisObj = fn, fn = options, options = 1;
		var par = _parallel(options);
		thisObj = thisObj !== undefined ? thisObj : this;
		return new Decorated(function(_) {
			while (true) {
				var val = reader.read(_);
				if (val === undefined) return undefined;
				if (fn.call(thisObj, _, val)) return val;
			}
		});
	};

	reader.every_ = function(_, options, fn, thisObj) {
		if (typeof options === "function") thisObj = fn, fn = options, options = 1;
		var par = _parallel(options);
		thisObj = thisObj !== undefined ? thisObj : this;
		while (true) {
			var val = reader.read(_);
			if (val === undefined) return true;
			if (!fn.call(thisObj, _, val)) return false;
		}
	};

	reader.some_ = function(_, options, fn, thisObj) {
		if (typeof options === "function") thisObj = fn, fn = options, options = 1;
		var par = _parallel(options);
		thisObj = thisObj !== undefined ? thisObj : this;
		while (true) {
			var val = reader.read(_);
			if (val === undefined) return false;
			if (fn.call(thisObj, _, val)) return true;
		}
	};

	reader.reduce_ = function(_, fn, v, thisObj) {
		thisObj = thisObj !== undefined ? thisObj : this;
		while (true) {
			var val = reader.read(_);
			if (val === undefined) return v;
			v = fn.call(thisObj, _, v, val);
		}
	};

	reader.pipe_ = function(_, writer) {
		do {
			var val = this.read(_);
			writer.write(_, val);
		} while (val !== undefined);
	};

	return reader;
}

exports.decorate(Decorated.prototype);

