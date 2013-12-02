"use strict";
QUnit.module(module.id);
var streams = require("streamline-streams");
var jsonTrans = require("streamline-streams/lib/transforms/json");

var inputFile = require('os').tmpdir() + '/jsonInput.json';
var outputFile = require('os').tmpdir() + '/jsonOutput.json';
var fs = require('streamline-fs');
var stringlets = require("streamline-streams/lib/xlets/string");

var mixedData = '[' + //
'{ "firstName": "Jimy", "lastName": "Hendrix" },' + //
'\n { "firstName": "Jim", "lastName": "Morrison" },' + //
'\n"\\\"escape\\ttest",' + //
'\n"people are strange", 27, null,' + //
'\n { "firstName": "Janis", ' + //
'\n    "lastName": "Joplin" },' + //
'\n[1,2, 3, ' + //
'\n 5, 8, 13],' + //
'\n true]';

function nativeStream(_, text) {
	fs.writeFile(inputFile, text, "utf8", _);
	return new streams.ReadableStream(fs.createReadStream(inputFile, {
		encoding: "utf8"
	}));
}

asyncTest("empty", 1, function(_) {
	var stream = nativeStream(_, '[]').transform(jsonTrans.parser());
	strictEqual(stream.read(_), undefined, "undefined");
	start();
});

asyncTest("mixed data with native node stream", 9, function(_) {
	var stream = nativeStream(_, mixedData);
	var expected = JSON.parse(mixedData);
	stream.transform(jsonTrans.parser()).forEach(_, function(_, elt, i) {
		deepEqual(elt, expected[i], expected[i]);
	});
	start();
});

asyncTest("fragmented read", 9, function(_) {
	var stream = stringlets.source(mixedData, 2).transform(jsonTrans.parser());
	var expected = JSON.parse(mixedData);
	stream.forEach(_, function(_, elt, i) {
		deepEqual(elt, expected[i], expected[i]);
	});
	start();
});

asyncTest("roundtrip", 11, function(_) {
	var sink = stringlets.sink();
	nativeStream(_, mixedData).transform(jsonTrans.parser()).map(function(_, elt) {
		return (elt && elt.lastName) ? elt.lastName : elt;
	}).transform(jsonTrans.formatter()).pipe(_, sink);
	var result = JSON.parse(sink.toString());
	var expected = JSON.parse(mixedData).map(function(elt) {
		return (elt && elt.lastName) ? elt.lastName : elt;
	});
	ok(Array.isArray(result), "isArray");
	equal(result.length, expected.length, "length=" + result.length)
	result.forEach(function(elt, i) {
		deepEqual(result[i], elt, elt);
	});
	start();
});
