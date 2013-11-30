"use strict";

var streams = require('streamline-streams');

function numbers() {
	var i = 0;
	return streams.source(function read(_) {
		return i++;
	});
}

function wait(_, val) {
	setTimeout(~_, 200);
	return val;
}

function pow(n) {
	return function(_, val) {
		return Math.pow(val, n);
	}
}

function minJoiner(_, values) {
	var min = Math.min.apply(null, values);
	values.forEach(function(val, i) {
		if (val == min) values[i] = undefined;
	});
	return min;
}

//numbers().map(pow(2)).join(numbers().map(pow(3)).limit(4)).rr().map(wait).limit(20).pipe(_, streams.console.log);

numbers().fork([
	function(source) { return source.map(pow(2)).limit(4); },
	function(source) { return source.map(pow(3)); },
]).rr().map(wait).limit(30).pipe(_, streams.console.log);
