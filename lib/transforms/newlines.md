Stream transform for line-oriented text streams
## API

`var newlines = require('streamline-streams/lib/transforms/newlines')`  

* `transform = newlines.parser(options)`  
  creates a parser transform.
  `options` is reserved for future use.
* `transform = newlines.formatter(options)`  
  creates a formatter transform.
  `options.sep` defines the line separator. It is set to `\n` by default.
  `options.extra` indicates if an extra line separator must be emitted or not at the end. It is false by default.
