"use strict";
QUnit.module(module.id);

var api = require('streamline-streams/lib/api');
var arraySink = require('streamline-streams/lib/xlets/array').sink;

function numbers(limit) {
	var i = 0;
	return api.source(function read(_) {
		return i >= limit ? undefined : i++;
	});
}

function waiter(ms) {
	return function wait(_, val) {
		setTimeout(~_, ms);
		return val;
	}
}

function pow(n) {
	return function(_, val) {
		return Math.pow(val, n);
	}
}

function minJoiner(_, values) {
	var min = Math.min.apply(null, values);
	values.forEach(function(val, i) {
		if (val == min) values[i] = undefined;
	});
	return min;
}

asyncTest("forEach", 1, function(_) {
	var results = [];
	numbers(5).forEach(_, function(_, num) {
		results.push(num);
	});
	strictEqual(results.join(','), "0,1,2,3,4");
	start();
});

asyncTest("map", 1, function(_) {
	strictEqual(numbers(5).map(function(_, num) {
		return num * num;
	}).pipe(_, arraySink()).toArray().join(','), "0,1,4,9,16");
	start();
});

asyncTest("every", 3, function(_) {
	strictEqual(numbers(5).every(_, function(_, num) {
		return num < 5;
	}), true);
	strictEqual(numbers(5).every(_, function(_, num) {
		return num < 4;
	}), false);
	strictEqual(numbers(5).every(_, function(_, num) {
		return num != 2;
	}), false);
	start();
});

asyncTest("some", 3, function(_) {
	strictEqual(numbers(5).some(_, function(_, num) {
		return num >= 5;
	}), false);
	strictEqual(numbers(5).some(_, function(_, num) {
		return num >= 4;
	}), true);
	strictEqual(numbers(5).some(_, function(_, num) {
		return num != 2;
	}), true);
	start();
});

asyncTest("reduce", 1, function(_) {
	strictEqual(numbers(5).reduce(_, function(_, r, num) {
		return r + '/' + num;
	}, ""), "/0/1/2/3/4");
	start();
});

asyncTest("pipe", 1, function(_) {
	strictEqual(numbers(5).pipe(_, arraySink()).toArray().join(','), "0,1,2,3,4");
	start();
});

asyncTest("transform - same number of reads and writes", 1, function(_) {
	strictEqual(numbers(5).transform(function(_, reader, writer) {
		var sum = 0, val;
		while ((val = reader.read(_)) !== undefined) {
			sum += val;
			writer.write(_, sum);
		}
	}).pipe(_, arraySink()).toArray().join(','), "0,1,3,6,10");
	start();
});

asyncTest("transform - more reads than writes", 1, function(_) {
	strictEqual(numbers(12).transform(function(_, reader, writer) {
		var str = "", val;
		while ((val = reader.read(_)) !== undefined) {
			str += "-" + val;
			if (val % 5 === 4) { 
				writer.write(_, str);
				str = "";
			}
		}
		writer.write(_, str);
	}).pipe(_, arraySink()).toArray().join('/'), "-0-1-2-3-4/-5-6-7-8-9/-10-11");
	start();
});

asyncTest("transform - less reads than writes", 1, function(_) {
	strictEqual(numbers(5).transform(function(_, reader, writer) {
		var str = "", val;
		while ((val = reader.read(_)) !== undefined) {
			for (var i = 0; i < val; i++) writer.write(_, val);
		}
	}).pipe(_, arraySink()).toArray().join(','), "1,2,2,3,3,3,4,4,4,4");
	start();
});

asyncTest("filter", 1, function(_) {
	strictEqual(numbers(10).filter(function(_, val) {
		return val % 2;
	}).pipe(_, arraySink()).toArray().join(','), "1,3,5,7,9");
	start();
});

asyncTest("while", 1, function(_) {
	strictEqual(numbers().while(function(_, val) {
		return val < 5;
	}).pipe(_, arraySink()).toArray().join(','), "0,1,2,3,4");
	start();
});

asyncTest("until", 1, function(_) {
	strictEqual(numbers().until(function(_, val) {
		return val > 5;
	}).pipe(_, arraySink()).toArray().join(','), "0,1,2,3,4,5");
	start();
});

/*
//numbers().map(pow(2)).join(numbers().map(pow(3)).limit(4)).rr().map(wait).limit(20).pipe(_, streams.console.log);
numbers().fork([
	function(source) { return source.map(pow(2)).limit(4); },
	function(source) { return source.map(pow(3)); },
]).rr().map(wait).limit(30).pipe(_, streams.console.log);

numbers().parallelize(5, function(source) {
	return source.map(pow(2)).map(wait);
}).limit(30).pipe(_, streams.console.log);
*/