QUnit.module(module.id);
var streams = require("streamline-streams");
var newlines = require("streamline-streams/lib/transforms/newlines");

var inputFile = require('os').tmpdir() + '/jsonInput.json';
var outputFile = require('os').tmpdir() + '/jsonOutput.json';
var fs = require('streamline-fs');

function testStream(_, text) {
	fs.writeFile(inputFile, text, "utf8", _);
	return new streams.ReadableStream(fs.createReadStream(inputFile, {
		encoding: "utf8"
	})).transform(newlines.parser());
}

function memorySource(text, chunkSize) {
	var pos = 0;
	var stream = {
		read: function(_) {
			setTimeout(~_, 0);
			if (pos >= text.length) return;
			var s = text.substring(pos, pos + chunkSize);
			pos += chunkSize;
			return s;
		},
	};
	return require('streamline-streams/lib/api').decorate(stream);
}

function memorySink() {
	var buf = "";
	return {
		write: function(_, data) {
			if (data === undefined) return;
			setTimeout(~_, 0);
			buf += data;
		},
		toString: function() {
			return buf;
		},
	};
}

asyncTest("empty", 2, function(_) {
	var stream = testStream(_, '');
	strictEqual(stream.read(_), '', "empty line");
	strictEqual(stream.read(_), undefined, "undefined");
	start();
});

asyncTest("only newline", 3, function(_) {
	var stream = testStream(_, '\n');
	strictEqual(stream.read(_), '', "empty line");
	strictEqual(stream.read(_), '', "empty line");
	strictEqual(stream.read(_), undefined, "undefined");
	start();
});

asyncTest("empty", 5, function(_) {
	var stream = testStream(_, 'abc\n\ndef\nghi');
	strictEqual(stream.read(_), 'abc', 'abc');
	strictEqual(stream.read(_), '', "empty line");
	strictEqual(stream.read(_), 'def', 'def');
	strictEqual(stream.read(_), 'ghi', 'ghi');
	strictEqual(stream.read(_), undefined, "undefined");
	start();
});

asyncTest("roundtrip", 1, function(_) {
	var sink = memorySink();
	var text = 'abc\n\ndef\nghi';
	memorySource(text, 2).transform(newlines.parser()).transform(newlines.formatter()).pipe(_, sink);
	strictEqual(sink.toString(), text, text);
	start();
});
