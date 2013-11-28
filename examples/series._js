"use strict";

var streams = require('streamline-streams');

function powers(n) {
	var i = 0;
	return streams.source(function read(_) {
		return Math.pow(++i, n);
	}); 
}

function wait(_, val) {
	setTimeout(~_, 500);
	return val;	
}

powers(2).skip(3).map(wait).pipe(_, streams.console.log);
//powers(2).skip(3).limit(20).map(wait).pipe(_, streams.console.log);
