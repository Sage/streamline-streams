"use strict";

var streams = require('streamline-streams');

function powers(n) {
	var i = 0;
	return streams.source(function read(_) {
		return Math.pow(++i, n);
	}); 
}

function wait(_, val) {
	setTimeout(~_, 1000);
	return val;	
}

powers(2).skip(3).limit(20).map(wait).buffer(3).pipe(_, streams.console.log);
