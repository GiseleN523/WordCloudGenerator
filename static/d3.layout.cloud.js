(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g=(g.d3||(g.d3 = {}));g=(g.layout||(g.layout = {}));g.cloud = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
    // Word cloud layout by Jason Davies, https://www.jasondavies.com/wordcloud/
    // Algorithm due to Jonathan Feinberg, http://static.mrfeinberg.com/bv_ch03.pdf
    //somewhere in this line ^ is the part where the file is given the flexibility to use amd (as opposed to node.js), which is what is allowing it to be imported into observable
    
    var dispatch = require("d3-dispatch").dispatch; //used for "word" and "end" events
    
    var cloudRadians = Math.PI / 180,
        cw = 1 << 11 >> 5, //cw = 1000000? Xingyi: used to represent each spot in the cloud canvas and, in binary, whether it is filled or not
        ch = 1 << 11; // ch = 100000000000?
    
    module.exports = function() { //this is what gets calleda when someone require()s the file (node.js)
      var size = [256, 256],
          text = cloudText, //the values these variables are being set to are all methods that are defined later, outside of this function
          font = cloudFont,
          fontSize = cloudFontSize,
          fontStyle = cloudFontNormal,
          fontWeight = cloudFontNormal,
          rotate = cloudRotate,
          padding = cloudPadding,
          spiral = archimedeanSpiral,
          words = [],
          timeInterval = Infinity,
          event = dispatch("word", "end"), //the two events available to the user--uses d3-dispatch: https://github.com/d3/d3-dispatch
          timer = null,
          random = Math.random,
          cloud = {}, //this is the object that will be returned when someone require()s the file
          canvas = cloudCanvas;
    
      cloud.canvas = function(_) { //"_" indicates no parameter required/parameter not to be used...and yet it is used?
        return arguments.length ? (canvas = functor(_), cloud) : canvas; //my best guess is that this checks whether there is at least 1 argument, and if there is, it sets canvas to it (using functor() to ensure it's a function)
      };
    
      cloud.start = function() {
        var contextAndRatio = getContext(canvas()),
            board = zeroArray((size[0] >> 5) * size[1]), //creates array of n zeros to represent the board. On the width dimension, every 32 1-bit pixels is represented by a 32 bit integer.
            bounds = null,
            n = words.length,
            i = -1,
            tags = [],
            data = words.map(function(d, i) { //maps each item in word to itself? but changes values of its variables
              d.text = text.call(this, d, i); //calls function text on this, with d and i as parameters
              d.font = font.call(this, d, i);
              d.style = fontStyle.call(this, d, i);
              d.weight = fontWeight.call(this, d, i);
              d.rotate = rotate.call(this, d, i);
              d.size = ~~fontSize.call(this, d, i); //~~ is double NOT bitwise operator, faster substitute for flooring
              d.padding = padding.call(this, d, i);
              return d;
            }).sort(function(a, b) { return b.size - a.size; }); //sorts data (map of words) in descending order by length
    
        if (timer) clearInterval(timer);
        timer = setInterval(step, 0); //if there is an existing (non null) timer, clear it and reset it
        step();
    
        return cloud; //return an instance of cloud, with all the methods that were just created, to the thing that require()ed the file
    
        function step() {
          var start = Date.now();
          while (Date.now() - start < timeInterval && ++i < n && timer) { //while time elapsed is less than timeInterval (provided timer exists). i is the index of word to be placed
            var d = data[i];
            d.x = (size[0] * (random() + .5)) >> 1; //set x to a position around the center of the canvas. 
            d.y = (size[1] * (random() + .5)) >> 1; //same for y
            cloudSprite(contextAndRatio, d, data, i); 
            if (d.hasText && place(board, d, bounds)) { //if there is text associated with the tag and it is then successfully placed:
              tags.push(d); //add this item in data to tags
              event.call("word", cloud, d); //call the event "word" (a word has been placed) on cloud/with cloud as its "this" and d as an argument
              if (bounds) cloudBounds(bounds, d);
              else bounds = [{x: d.x + d.x0, y: d.y + d.y0}, {x: d.x + d.x1, y: d.y + d.y1}]; //if bounds don't exist, use this
              // Temporary hack
              d.x -= size[0] >> 1;
              d.y -= size[1] >> 1;
            }
          }
          if (i >= n) { //stop when all words have been placed and call "end" event
            cloud.stop();
            event.call("end", cloud, tags, bounds); //call "end" event on cloud/with cloud as its "this", and pass tags and bounds as arguments
          }
        }
      }
    
      cloud.stop = function() { //reset timer to null and clear it
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
        return cloud;
      };
    
      function getContext(canvas) { //adjusts canvas' width and height with calculated ratio, and returns its context along with that ratio 
        canvas.width = canvas.height = 1;
        var ratio = Math.sqrt(canvas.getContext("2d").getImageData(0, 0, 1, 1).data.length >> 2); //take the pixel data in top left pixel, then take the square root of the length of its data (array of RBGA) moved over 2 bits -> 4? (why?)
        canvas.width = (cw << 5) / ratio; //100000000000 / ratio?
        canvas.height = ch / ratio; //100000000000 / ratio?
    
        var context = canvas.getContext("2d"); //w3schools: The getContext() method returns an object that provides methods and properties for drawing on the canvas.
        context.fillStyle = context.strokeStyle = "red";
        context.textAlign = "center";
    
        return {context: context, ratio: ratio};
      }
    
      function place(board, tag, bounds) {
        var perimeter = [{x: 0, y: 0}, {x: size[0], y: size[1]}], //perimeter is array with object at top left corner coordinates and object at bottom right corner coordinates...according to vscode, it never gets used
            startX = tag.x,
            startY = tag.y,
            maxDelta = Math.sqrt(size[0] * size[0] + size[1] * size[1]), //pythagorean theorem; maxDelta is hypotenuse length between size[0] and size[1] (width and length dimensions)
            s = spiral(size),  // desired spiral type
            dt = random() < .5 ? 1 : -1, //randomly set to 1 or -1 
            t = -dt,
            dxdy,
            dx,
            dy;
    
        while (dxdy = s(t += dt)) { 
          dx = ~~dxdy[0]; //floor items
          dy = ~~dxdy[1];
    
          if (Math.min(Math.abs(dx), Math.abs(dy)) >= maxDelta) break; //break if dx or dy are bigger than length of cloud diagonal/hypotenuse
    
          tag.x = startX + dx;
          tag.y = startY + dy;
    
          if (tag.x + tag.x0 < 0 || tag.y + tag.y0 < 0 ||
              tag.x + tag.x1 > size[0] || tag.y + tag.y1 > size[1]) continue; //if placement is out of bounds of cloud, try again
          // TODO only check for collisions within current bounds.
          if (!bounds || !cloudCollide(tag, board, size[0])) { //if no collision
            if (!bounds || collideRects(tag, bounds)) {
              var sprite = tag.sprite, //get the sprite results, not sure what exactly it is 
                  w = tag.width >> 5, //compress width of the tag
                  sw = size[0] >> 5, //compress the coordinates of the board
                  lx = tag.x - (w << 4),
                  sx = lx & 0x7f,
                  msx = 32 - sx,
                  h = tag.y1 - tag.y0,
                  x = (tag.y + tag.y0) * sw + (lx >> 5),
                  last;
              for (var j = 0; j < h; j++) { //nested loops: iterate through every pixel in the tag
                last = 0;
                for (var i = 0; i <= w; i++) {
                  board[x + i] |= (last << msx) | (i < w ? (last = sprite[j * w + i]) >>> sx : 0); // update the board status through binary OR operation
                }
                x += sw;
              }
              delete tag.sprite;
              return true;
            }
          }
        }
        return false;
      }
    
      cloud.timeInterval = function(_) {
        return arguments.length ? (timeInterval = _ == null ? Infinity : _, cloud) : timeInterval; //if argument null is supplied, set timeInterval to Infinity; if a different argument is supplied, set timeInterval to it
      };
    
      cloud.words = function(_) {
        return arguments.length ? (words = _, cloud) : words; //if argument is supplied, to set words
      };
    
      cloud.size = function(_) {
        return arguments.length ? (size = [+_[0], +_[1]], cloud) : size; //if argument is supplied, use it to set size (array of two items (size dimensions))
      };
    
      cloud.font = function(_) {
        return arguments.length ? (font = functor(_), cloud) : font; //if argument is supplied, set font to it (using functor() to ensure it is a function)
      };
    
      cloud.fontStyle = function(_) {
        return arguments.length ? (fontStyle = functor(_), cloud) : fontStyle; //if argument is supplied, set fontStyle to it (using functor() to ensure it is a function)
      };
    
      cloud.fontWeight = function(_) {
        return arguments.length ? (fontWeight = functor(_), cloud) : fontWeight; //if argument is supplied, set fontWeight to it (using functor() to ensure it is a function)
      };
    
      cloud.rotate = function(_) {
        return arguments.length ? (rotate = functor(_), cloud) : rotate; //if argument is supplied, set rotate to it (using functor() to ensure it is a function)
      };
    
      cloud.text = function(_) {
        return arguments.length ? (text = functor(_), cloud) : text; //if argument is supplied, set text to it (using functor() to ensure it is a function)
      };
    
      cloud.spiral = function(_) {
        return arguments.length ? (spiral = spirals[_] || _, cloud) : spiral; //if argument is supplied, either set spiral to the item at that index in spirals, or just return it
      };
    
      cloud.fontSize = function(_) {
        return arguments.length ? (fontSize = functor(_), cloud) : fontSize; //if argument is supplied, set fontSize to it (using functor() to ensure it is a function)
      };
    
      cloud.padding = function(_) {
        return arguments.length ? (padding = functor(_), cloud) : padding; //if argument is supplied, set padding to it (using functor() to ensure it is a function)
      };
    
      cloud.random = function(_) {
        return arguments.length ? (random = _, cloud) : random; //if argument is supplied, set random to it
      };
    
      cloud.on = function() { //uses argument (not sure why it isn't shown in header) as callback/action to take when event happens (I THINK it basically takes d3-dispatch on() method and turns it into a cloud method)
        var value = event.on.apply(event, arguments); //arguments: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/arguments - why isn't it specified which of the two items in event to bind it to?
        return value === event ? cloud : value; //totally spectulation: if action for event already exists, return cloud, but return the new event if it changed
      };
    
      return cloud; //when d3.layout.cloud is required, return an instance of this cloud object with these methods that can be used
    };
    
    function cloudText(d) { //these methods are all used to set variables of the cloud object defined above (in this case, the variable text is set equal to this method)
      return d.text;
    }
    
    function cloudFont() {
      return "serif";
    }
    
    function cloudFontNormal() {
      return "normal";
    }
    
    function cloudFontSize(d) { //my theory about this is that it's similar to the circle radius vs area issue; maybe we have to square root it because text size grows in two dimensions and so it would grow exponentially if we didn't
      return Math.sqrt(d.value);
    }
    
    function cloudRotate() {
      return (~~(Math.random() * 6) - 3) * 30; //default between -90 and 90 degrees rotation
    }
    
    function cloudPadding() {
      return 1;
    }
    
    // Fetches a monochrome sprite bitmap for the specified text.
    // Load in batches for speed.
    function cloudSprite(contextAndRatio, d, data, di) {
      if (d.sprite) return;
      var c = contextAndRatio.context,
          ratio = contextAndRatio.ratio;
    
      c.clearRect(0, 0, (cw << 5) / ratio, ch / ratio); //(0, 0, 100000000000 / ratio, 100000000000 / ratio)?
      var x = 0,
          y = 0,
          maxh = 0,
          n = data.length;
      --di;
      while (++di < n) {
        d = data[di];
        c.save();
        c.font = d.style + " " + d.weight + " " + ~~((d.size + 1) / ratio) + "px " + d.font;
        console.log(d);
        var w = c.measureText(d.text + "m").width * ratio, //save width and height of the text
            h = d.size << 1;
        if (d.rotate) { //rotate if specified and adjust width and height variables
          var sr = Math.sin(d.rotate * cloudRadians),
              cr = Math.cos(d.rotate * cloudRadians),
              wcr = w * cr,
              wsr = w * sr,
              hcr = h * cr,
              hsr = h * sr;
          w = (Math.max(Math.abs(wcr + hsr), Math.abs(wcr - hsr)) + 0x1f) >> 5 << 5;
          h = ~~Math.max(Math.abs(wsr + hcr), Math.abs(wsr - hcr));
        } else {
          w = (w + 0x1f) >> 5 << 5; //rounding up the width to the nearest power of 2. if less than 32, round up to 32.
        }
        if (h > maxh) maxh = h; //keep track of height of tallest word so far 
        if (x + w >= (cw << 5)) { // out of the boundary horizontally
          x = 0;    //start a new line
          y += maxh;   // the new line must be at least maxh from the line before.
          maxh = 0;   // reset the largest height
        }
        if (y + h >= ch) break;   // if y also out of bound, placement stops
        c.translate((x + (w >> 1)) / ratio, (y + (h >> 1)) / ratio);
        if (d.rotate) c.rotate(d.rotate * cloudRadians);
        c.fillText(d.text, 0, 0);
        if (d.padding) c.lineWidth = 2 * d.padding, c.strokeText(d.text, 0, 0);
        c.restore();
        d.width = w;
        d.height = h;
        d.xoff = x;
        d.yoff = y;
        d.x1 = w >> 1;    //boundary of the text, right 
        d.y1 = h >> 1;   //boundary of the text, down
        d.x0 = -d.x1;  //boundary of the text, left
        d.y0 = -d.y1;   ////boundary of the text, up 
        d.hasText = true;
        x += w;   // add x location for next placement
      }
      var pixels = c.getImageData(0, 0, (cw << 5) / ratio, ch / ratio).data, //getImageData(): https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/getImageData (0, 0, 100000000000 / ratio, 100000000000 / ratio)?
          sprite = []; //^returns this portion of the pixel data (RGBA colors) in contextAndRatio.context parameter
      while (--di >= 0) { //iterate through words
        d = data[di];
        if (!d.hasText) continue; 
        var w = d.width,
            w32 = w >> 5,
            h = d.y1 - d.y0;
        // Zero the buffer
        for (var i = 0; i < h * w32; i++) sprite[i] = 0;
        x = d.xoff;
        if (x == null) return;
        y = d.yoff;
        var seen = 0,
            seenRow = -1;
        for (var j = 0; j < h; j++) {
          for (var i = 0; i < w; i++) {
            var k = w32 * j + (i >> 5),
                m = pixels[((y + j) * (cw << 5) + (x + i)) << 2] ? 1 << (31 - (i % 32)) : 0;
            sprite[k] |= m;
            seen |= m;
          }
          if (seen) seenRow = j;
          else {
            d.y0++;
            h--;
            j--;
            y++;
          }
        }
        d.y1 = d.y0 + seenRow;
        d.sprite = sprite.slice(0, (d.y1 - d.y0) * w32);
      }
    }
    
    // Use mask-based collision detection.
    function cloudCollide(tag, board, sw) {//sw is size[0] (default 256) the one time this function is called
      sw >>= 5; //for default value 256, this becomes 4
      var sprite = tag.sprite,
          w = tag.width >> 5,
          lx = tag.x - (w << 4),
          sx = lx & 0x7f,
          msx = 32 - sx,
          h = tag.y1 - tag.y0,
          x = (tag.y + tag.y0) * sw + (lx >> 5),
          last;
      for (var j = 0; j < h; j++) { //nested loops: iterate through every pixel in tag
        last = 0;
        for (var i = 0; i <= w; i++) {
          if (((last << msx) | (i < w ? (last = sprite[j * w + i]) >>> sx : 0)) 
              & board[x + i]) return true; //really not sure about this line; it's probably checking for collisions?
        }
        x += sw;
      }
      return false;
    }
    
    function cloudBounds(bounds, d) { //if bounds is smaller (falls within) d's bounds, adjust that coordinate to d's
      var b0 = bounds[0],
          b1 = bounds[1];
      if (d.x + d.x0 < b0.x) b0.x = d.x + d.x0;
      if (d.y + d.y0 < b0.y) b0.y = d.y + d.y0;
      if (d.x + d.x1 > b1.x) b1.x = d.x + d.x1; 
      if (d.y + d.y1 > b1.y) b1.y = d.y + d.y1;
    }
    
    function collideRects(a, b) {
      return a.x + a.x1 > b[0].x && a.x + a.x0 < b[1].x && a.y + a.y1 > b[0].y && a.y + a.y0 < b[1].y;
    }
    
    function archimedeanSpiral(size) { //method for generating archimedeanSpiral (default)
      var e = size[0] / size[1];
      return function(t) {
        return [e * (t *= .1) * Math.cos(t), t * Math.sin(t)];
      };
    }
    
    function rectangularSpiral(size) { //method for generating rectangularSpiral if someone changes the setting to that
      var dy = 4,
          dx = dy * size[0] / size[1],
          x = 0,
          y = 0;
      return function(t) {
        var sign = t < 0 ? -1 : 1;
        // See triangular numbers: T_n = n * (n + 1) / 2.
        switch ((Math.sqrt(1 + 4 * sign * t) - sign) & 3) {
          case 0:  x += dx; break;
          case 1:  y += dy; break;
          case 2:  x -= dx; break;
          default: y -= dy; break;
        }
        return [x, y];
      };
    }
    
    // TODO reuse arrays?
    function zeroArray(n) { //creates array length n that is filled with zeros
      var a = [],
          i = -1;
      while (++i < n) a[i] = 0;
      return a;
    }
    
    function cloudCanvas() {
      return document.createElement("canvas"); //creates an HTML <canvas> element
    }
    
    function functor(d) {
      return typeof d === "function" ? d : function() { return d; }; //if d is a function, return it; otherwise, create a function that returns d (guarantees d is a function)
    }
    
    var spirals = { //possible spiral types (variables point to functions defined earlier)
      archimedean: archimedeanSpiral,
      rectangular: rectangularSpiral
    };
    
    },{"d3-dispatch":2}],2:[function(require,module,exports){
    // https://d3js.org/d3-dispatch/ Version 1.0.3. Copyright 2017 Mike Bostock.
    (function (global, factory) {
        typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
        typeof define === 'function' && define.amd ? define(['exports'], factory) :
        (factory((global.d3 = global.d3 || {})));
    }(this, (function (exports) { 'use strict';
    
    var noop = {value: function() {}}; //object with only value, an empty function, as a variable
    
    function dispatch() {
      for (var i = 0, n = arguments.length, _ = {}, t; i < n; ++i) {
        if (!(t = arguments[i] + "") || (t in _)) throw new Error("illegal type: " + t);
        _[t] = [];
      }
      return new Dispatch(_);
    }
    
    function Dispatch(_) {
      this._ = _;
    }
    
    function parseTypenames(typenames, types) { //my guess: takes event type someone tried to add a listener for and, if it's valid (either "word" or "end"), binds the listener to it
      return typenames.trim().split(/^|\s+/).map(function(t) {
        var name = "", i = t.indexOf(".");
        if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
        if (t && !types.hasOwnProperty(t)) throw new Error("unknown type: " + t);
        return {type: t, name: name};
      });
    }
    
    Dispatch.prototype = dispatch.prototype = {
      constructor: Dispatch,
      on: function(typename, callback) {
        var _ = this._,
            T = parseTypenames(typename + "", _),
            t,
            i = -1,
            n = T.length;
    
        // If no callback was specified, return the callback of the given type and name.
        if (arguments.length < 2) {
          while (++i < n) if ((t = (typename = T[i]).type) && (t = get(_[t], typename.name))) return t;
          return;
        }
    
        // If a type was specified, set the callback for the given type and name.
        // Otherwise, if a null callback was specified, remove callbacks of the given name.
        if (callback != null && typeof callback !== "function") throw new Error("invalid callback: " + callback);
        while (++i < n) {
          if (t = (typename = T[i]).type) _[t] = set(_[t], typename.name, callback);
          else if (callback == null) for (t in _) _[t] = set(_[t], typename.name, null);
        }
    
        return this;
      },
      copy: function() {
        var copy = {}, _ = this._;
        for (var t in _) copy[t] = _[t].slice();
        return new Dispatch(copy);
      },
      call: function(type, that) {
        if ((n = arguments.length - 2) > 0) for (var args = new Array(n), i = 0, n, t; i < n; ++i) args[i] = arguments[i + 2];
        if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
        for (t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
      },
      apply: function(type, that, args) {
        if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
        for (var t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
      }
    };
    
    function get(type, name) { //return value of item in type whose name is equal to name parameter
      for (var i = 0, n = type.length, c; i < n; ++i) {
        if ((c = type[i]).name === name) {
          return c.value;
        }
      }
    }
    
    function set(type, name, callback) { //find item in type with name, set it to noop (object with value variable that is an empty function), and remove items up to and including i from type
      for (var i = 0, n = type.length; i < n; ++i) {
        if (type[i].name === name) {
          type[i] = noop, type = type.slice(0, i).concat(type.slice(i + 1));
          break;
        }
      }
      if (callback != null) type.push({name: name, value: callback}); //if callback argument supplied, add a new object to type that has name equal to name argument and value equal to callback argument
      return type;
    }
    
    exports.dispatch = dispatch;
    
    Object.defineProperty(exports, '__esModule', { value: true });
    
    }))); //what are these last four lines??
    
    },{}]},{},[1])(1)
    });