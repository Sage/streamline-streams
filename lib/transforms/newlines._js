"use strict";
/// !doc
/// Stream transform for line-oriented text streams
/// ## API
/// 
/// `var newlines = require('streamline-streams/lib/transforms/newlines')`  
/// 
/// * `transform = newlines.parser(options)`  
///   creates a parser transform.
///   `options` is reserved for future use.
exports.parser = function(options) {
	options = options || {};

	function clean(line) {
		return line[line.length - 1] === '\r' ? line.substring(0, line.length - 1) : line;
	}
	return function(_, reader, writer) {
		var remain = "";
		reader.forEach(_, function(_, chunk) {
			var lines = chunk.split('\n');
			if (lines.length > 1) {
				writer.write(_, clean(remain + lines[0]));
				for (var i = 1; i < lines.length - 1; i++) writer.write(_, clean(lines[i]));
				remain = lines[i];
			} else {
				remain += lines[0];
			}
		});
		writer.write(_, remain);
	};
}

/// * `transform = newlines.formatter(options)`  
///   creates a formatter transform.
///   `options.sep` defines the line separator. It is set to `\n` by default.
///   `options.extra` indicates if an extra line separator must be emitted or not at the end. It is false by default.
exports.formatter = function(options) {
	options = options || {};
	var sep = options.sep || '\n';
	return function(_, reader, writer) {
		if (options.extra) {
			reader.forEach(_, function(_, line) {
				writer.write(_, line + sep);
			});
		} else {
			reader.forEach(_, function(_, line, i) {
				writer.write(_, i > 0 ? sep + line : line);
			});
		}
	}
}