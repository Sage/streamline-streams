"use strict";

var streams = require('streamline-streams');

function numbers() {
	var i = 0;
	return streams.source(function read(_) {
		return i++;
	});
}

function wait(_, val) {
	setTimeout(~_, 1000);
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

numbers().map(pow(2)).join(numbers().map(pow(3)), minJoiner).map(wait).limit(20).pipe(_, streams.console.log);