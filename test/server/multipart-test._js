"use strict";
QUnit.module(module.id);

var buffer = require('streamline-streams/lib/endpoints/buffer');
var multipart = require('streamline-streams/lib/transforms/multipart')

function makeRequest(headers, buf) {
		return {
			headers: headers,
			read: function(_, len) {
				if (buf.length === 0) return null;
				var end = Math.min(len, buf.length);
				var b = buf.slice(0, end);
				buf = buf.slice(end);
				return b;
			},
			unread: function(b) {
				buf = Buffer.concat([b, buf]);
			},
			readAll: function(_) {
				return this.read(_, buf.length);
			}
		};
	}


asyncTest('basic multipart/form-data', 7, function(_) {
	var boundary = "-- my boundary --";
	var headers = {
		"content-type": "multipart/form-data;atb1=val1; boundary=" + boundary + "; atb2=val2",
	};
	var parts = [{
		headers: {
			A: "VA1",
			B: "VB1",
			"Content-Type": "text/plain",
		},
		body: "C1",
	}, {
		headers: {
			"content-type": "text/plain",
			A: "VA2",
			B: "VB2"
		},
		body: "C2",
	}];

	function formatPart(part) {
		return Object.keys(part.headers).map(function(name) {
			return name + ': ' + part.headers[name]
		}).join('\n') + '\n\n' + boundary + '\n' + part.body + '\n' + boundary + '\n';
	}
	var source = buffer.source(new Buffer(parts.map(formatPart).join(''), "binary"));

	var stream = source.transform(multipart.parser(headers));
	var part = stream.read(_);
	ok(part != null, "part != null");
	strictEqual(part.headers.a, "VA1", "header A");
	strictEqual(part.headers.b, "VB1", "header B");
	strictEqual(part.headers["content-type"], "text/plain", "content-type");
	var r = part.read(_);
	strictEqual(r.toString('binary'), 'C1', 'body C1');
	r = part.read(_);
	strictEqual(r, undefined, "end of part 1");

	part = stream.read(_);
	equal(part, undefined, "read next part returns undefined");
	start();
});

asyncTest('basic multipart/mixed', 13, function(_) {
	var boundary = "-- my boundary --";
	var headers = {
		"content-type": "multipart/mixed;atb1=val1; boundary=" + boundary + "; atb2=val2",
	};
	var parts = [{
		headers: {
			A: "VA1",
			B: "VB1",
			"Content-Type": "text/plain",
		},
		body: "C1",
	}, {
		headers: {
			"content-type": "text/plain",
			A: "VA2",
			B: "VB2"
		},
		body: "C2",
	}];

	function formatPart(part) {
		return Object.keys(part.headers).map(function(name) {
			return name + ': ' + part.headers[name]
		}).join('\n') + '\n\n' + boundary + '\n' + part.body + '\n' + boundary + '\n';
	}
	var source = buffer.source(new Buffer(parts.map(formatPart).join(''), "binary"));

	var stream = source.transform(multipart.parser(headers));
	var part = stream.read(_);
	ok(part != null, "part != null");
	strictEqual(part.headers.a, "VA1", "header A");
	strictEqual(part.headers.b, "VB1", "header B");
	strictEqual(part.headers["content-type"], "text/plain", "content-type");
	var r = part.read(_);
	strictEqual(r.toString('binary'), 'C1', 'body C1');
	r = part.read(_);
	strictEqual(r, undefined, "end of part 1");

	part = stream.read(_);
	ok(part != null, "part != null");
	strictEqual(part.headers.a, "VA2", "header A");
	strictEqual(part.headers.b, "VB2", "header B");
	strictEqual(part.headers["content-type"], "text/plain", "content-type");
	var r = part.read(_);
	strictEqual(r.toString('binary'), 'C2', 'body C2');
	r = part.read(_);
	strictEqual(r, undefined, "end of part 2");

	part = stream.read(_);
	equal(part, undefined, "read next part returns undefined");
	start();
});