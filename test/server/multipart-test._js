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
	var partHeaders = "Header1: value1\nContent-Type: text/plain\nHeader2: value2\n";
	var text = "A";
	var source = buffer.source(new Buffer(partHeaders + '\n' + boundary + '\n' + text + '\n' + boundary, "binary"));

	var stream = source.transform(multipart.parser(headers));
	var part = stream.read(_);
	ok(part != null, "part != null");
	strictEqual(part.headers.header1, "value1", "header1");
	strictEqual(part.headers["content-type"], "text/plain", "content-type");
	strictEqual(part.headers.header2, "value2", "header2");
	var r = part.read(_);
	strictEqual(r.toString('binary'), 'A', 'A');
	r = part.read(_);
	strictEqual(r, undefined, "read part data returns undefined");
	part = stream.read(_);
	equal(part, undefined, "read next part returns undefined");
	start();
});

