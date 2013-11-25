"use strict";
/// !doc
/// Stream transforms for simple JSON streams
/// 
/// ## "Simple" JSON streams
/// 
/// A _simple JSON stream_ is a text stream with the following format:
/// 
/// * the stream starts with `[` and ends with `]`
/// * items are serialized in JSON format and separated by commas
/// 
/// In other words, the whole stream is just a valid JSON array.
/// 
/// There is no special contraint on spaces or line breaks, nor on items. Items are usually objects but they may also be simple values, arrays or even nulls. Items may or may not be separated by newlines. Any valid JSON array is a valid _simple JSON stream_.
/// 
/// For example the following is a valid simple JSON stream:
/// 
/// ``` json
/// [{ "firstName": "Jimy", "lastName": "Hendrix" },
///  { "firstName": "Jim", "lastName": "Morrison" },
///  "people are strange", 27, null,
///  { "firstName": "Janis", 
///    "lastName": "Joplin" },
///  [1, 2, 3, 
///   5, 8, 13],
///  true]
///  ```
/// 
/// ## Unbounded streams
/// 
/// Sometimes it is preferable to omit the `[` and `]` delimiters and to systematically append a comma after every entry, even after the last one. For example this is a better format for log files as it makes it easy to append entries.
/// 
/// This alternate format can be obtained by passing an `unbounded: true` option when creating the reader or the writer.
/// 
/// Here is an example of a normal, _bounded_, simple JSON stream:
/// 
/// ```
/// [{ "firstName": "Jimy", "lastName": "Hendrix" },
///  { "firstName": "Jim", "lastName": "Morrison" },
///  { "firstName": "Janis", "lastName": "Joplin" }]
/// ```
/// 
/// and the corresponding _unbounded_ stream:
/// 
/// ```
/// { "firstName": "Jimy", "lastName": "Hendrix" },
/// { "firstName": "Jim", "lastName": "Morrison" },
/// { "firstName": "Janis", "lastName": "Joplin" },
/// ```
/// 

var streams = require("streamline-streams");
var decorator = require("streamline-streams/lib/array-api");

/// ## API
/// 
/// `var jsonTrans = require('streamline-streams/lib/transforms/json')`  
/// 
/// * `transform = jsonTrans.parser(options)`  
///   creates a parser transform. The following options can be set:  
///   - `unbounded`: use _unbounded_ format  
///   - `reviver`: reviver function which is passed to [JSON.parse](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse)
exports.parser = function(options) {
	options = options || {};
	return function(_, reader, writer) {
		if (options.unbounded) {
			var original = reader;
			reader = Object.create(reader);
			reader.unread('[');
			reader.read = function(_) {
				if (!original) return undefined;
				var data = original.read(_);
				if (data != null) return data;
				original = null;
				return ']';
			}
		}

		var depth = 0,
			escape = false,
			quoted = false,
			beg, pos = 0,
			line = 1,
			commas = 0,
			count = 0,
			chunk = null,
			collected = "";

		function error(msg) {
			throw new Error(line + ": " + msg + " near " + (chunk ? chunk.substring(pos, pos + 20) : "<EOF>"));
		}

		function checkOpen(ch) {
			if (depth === 0) throw error("expected [, got " + ch);
		}

		function beginValue() {
			if (count !== commas) throw error("comma missing");
			count++;
			collected = "";
			beg = pos;
		}

		function finishValue(_, delta) {
			collected += chunk.substring(beg, pos + 1 + (delta || 0));
			var val = JSON.parse(collected, options.reviver);
			beg = undefined;
			writer.write(_, val);
		}

		while (chunk = reader.read(_)) {
			for (var pos = 0; pos < chunk.length; pos++) {
				var ch = chunk[pos];
				if (escape) {
					escape = false;
				} else if (quoted) {
					if (ch === '\\') escape = true;
					else if (ch === '"') {
						quoted = false;
						if (depth === 1) finishValue(_);
					}
				} else {
					switch (ch) {
					case '"':
						checkOpen(ch);
						if (depth === 1) beginValue();
						quoted = true;
						break;
					case '[':
						if (depth++ === 1) beginValue();
						break;
					case '{':
						checkOpen(ch);
						if (depth++ === 1) beginValue();
						break;
					case ']':
						checkOpen(ch);
						if (--depth === 1) finishValue(_);
						else if (depth === 0) {
							if (beg !== undefined) finishValue(_, -1);
							else return writer.write(_, undefined);
						}
						break;
					case '}':
						if (--depth === 1) finishValue(_);
						else checkOpen(ch);
						break;
					case ',':
						checkOpen(ch);
						if (depth === 1) {
							commas++;
							if (commas !== count) throw error("unexpected comma");
							if (beg !== undefined) finishValue(_, -1);
						}
						break;
					case ' ':
					case '\t':
					case '\r':
						if (depth === 1 && beg !== undefined) finishValue(_);
						break;
					case '\n':
						line++;
						break;
					default:
						checkOpen(ch);
						if (depth === 1 && beg === undefined) beginValue();
						break;
					}
				}
			}
			if (beg != null) {
				collected += chunk.substring(beg)
				beg = 0;
			}
		}
		if (depth !== 0) throw error("unexpected EOF: depth=" + depth);
		writer.write(_, undefined);
	};
}

/// * `transform = jsonTrans.formatter(options)`  
///   creates a formatter transform. The following options can be set:  
///   - `unbounded`: use _unbounded_ format  
///   - `replacer`: replacer function which is passed to [JSON.stringify](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse)
///   - `space`: space formatting directive which is passed to JSON.stringify.
exports.formatter = function(options) {
	options = options || {};
	return function(_, reader, writer) {
		if (!options.unbounded) writer.write(_, '[');
		reader.forEach_(_, function(_, obj, i) {
			if (i > 0) writer.write(_, ',\n');
			writer.write(_, JSON.stringify(obj, options.replacer, options.space));
		});
		writer.write(_, options.unbounded ? ',' : ']');
		writer.write(_);
	}
}
