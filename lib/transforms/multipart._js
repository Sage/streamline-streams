"use strict";

var base = require('streamline-streams/lib/endpoints/base');

exports.parser = function(options) {
	if (!options || !options["content-type"]) throw new Error("invalid options argument");
	var contentType = options["content-type"],
		match;
	if (!(match = /^multipart\/(form-data|mixed)/.exec(contentType))) return null;
	var subType = match[1];
	var atbs = contentType.split(/\s*;\s*/).reduce(function(r, s) {
		var kv = s.split(/\s*=\s*/);
		r[kv[0]] = kv[1];
		return r;
	}, {});
	var boundary = atbs.boundary;
	if (!boundary) throw new Error("multipart boundary missing");

	return function(_, reader, writer) {
		reader = reader.unreadable();
		while (true) {
			var buf = reader.read(_, 2048);
			if (!buf) return;
			var str = buf.toString("binary");;
			var i = str.indexOf(boundary);
			if (i < 0) throw new Error("boundary not found");
			var lines = str.substring(0, i).split(/\r?\n/);
			var headers = lines.slice(0, lines.length - 2).reduce(function(h, l) {
				var kv = l.split(/\s*:\s*/);
				h[kv[0].toLowerCase()] = kv[1];
				return h;
			}, {});
			i = str.indexOf('\n', i);
			reader.unread(buf.slice(i + 1));

			var read = function(_) {
				var len = Math.max(boundary.length, 256);
				var buf = reader.read(_, 32 * len);
				if (!buf) return;
				// would be nice if Buffer had an indexOf. Would avoid a conversion to string.
				// I could use node-buffertools but it introduces a dependency on a binary module.
				var s = buf.toString("binary");
				var i = s.indexOf(boundary);
				if (i >= 0) {
					i = s.lastIndexOf('\n', i);
					if (s[i - 1] === '\r') i--;
					if (subType === 'form-data') {
						// discard any trailing data
						while (reader.read(_) !== undefined);
					} else {
						var j = s.indexOf('\n', i + boundary.length);
						reader.unread(buf.slice(j + 1));
					}
					return i > 0 ? buf.slice(0, i) : undefined;
				} else {
					reader.unread(buf.slice(31 * len));
					return buf.slice(0, 31 * len);
				}
			}
			var partReader = base.source(read);
			partReader.headers = headers;
			writer.write(_, partReader);
		}
	};
};