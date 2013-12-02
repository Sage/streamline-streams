"use strict";
QUnit.module(module.id);
var streams = require("streamline-streams");
var newlines = require("streamline-streams/lib/transforms/newlines");
var api = require('streamline-streams/lib/api');

var inputFile = require('os').tmpdir() + '/jsonInput.json';
var outputFile = require('os').tmpdir() + '/jsonOutput.json';
var fs = require('streamline-fs');
var stringlets = require("streamline-streams/lib/xlets/string");

function nativeStream(_, text) {
	fs.writeFile(inputFile, text, "utf8", _);
	return new streams.ReadableStream(fs.createReadStream(inputFile, {
		encoding: "utf8"
	}));
}

asyncTest("empty", 2, function(_) {
	var stream = nativeStream(_, '').transform(newlines.parser());
	strictEqual(stream.read(_), '', "empty line");
	strictEqual(stream.read(_), undefined, "undefined");
	start();
});

asyncTest("only newline", 3, function(_) {
	var stream = nativeStream(_, '\n').transform(newlines.parser());
	strictEqual(stream.read(_), '', "empty line");
	strictEqual(stream.read(_), '', "empty line");
	strictEqual(stream.read(_), undefined, "undefined");
	start();
});

asyncTest("mixed", 5, function(_) {
	var stream = nativeStream(_, 'abc\n\ndef\nghi').transform(newlines.parser());
	strictEqual(stream.read(_), 'abc', 'abc');
	strictEqual(stream.read(_), '', "empty line");
	strictEqual(stream.read(_), 'def', 'def');
	strictEqual(stream.read(_), 'ghi', 'ghi');
	strictEqual(stream.read(_), undefined, "undefined");
	start();
});

asyncTest("roundtrip", 1, function(_) {
	var sink = stringlets.sink();
	var text = 'abc\n\ndef\nghi';
	stringlets.source(text, 2).transform(newlines.parser()).transform(newlines.formatter()).pipe(_, sink);
	strictEqual(sink.toString(), text, text);
	start();
});
