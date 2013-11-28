"use strict";

var fs = require('streamline-fs');
var path = require('path');
var streams = require('streamline-streams');
var newlines = require('streamline-streams/lib/transforms/newlines');

var root = process.argv[2] || '.';

fs.readdir(root, _).filter_(_, function(_, name) {
	return fs.stat(root + '/' + name, _).isFile();
}).forEach_(_, function(_, name) {
	var res = new streams.ReadableStream(fs.createReadStream(root + '/' + name, {
		encoding: "utf8"
	})).transform(newlines.parser()).reduce(_, function(_, r, line) {
		r.lines++;
		r.words += line.split(/\S+/).length - 1;
		r.chars += line.length + 1;
		return r;
	}, {
		lines: 0,
		words: 0,
		chars: 0,
	});
	console.log('\t' + (res.lines - 1) + '\t' + res.words + '\t' + (res.chars - 1) + '\t' + name);
});