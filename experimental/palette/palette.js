// Copyright (c) 2011 Google, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

/** 
 * @fileoverview Dygraphs options palette.
 *
 * @author konigsberg@google.com (Robert Konigsberg)
 */
"use strict";

function Palette() {
  this.model = {};
  this.onchange = function() {};
  this.filterBar = null;
}

Palette.createChild = function(type, parentElement) {
  var element = document.createElement(type);
  parentElement.appendChild(element);
  return element;
};

function Tooltip(parent) {
  if (!parent) {
    parent = document.getElementsByTagName("body")[0];
  }
  this.elem = Palette.createChild("div", parent);
  this.title = Palette.createChild("div", this.elem);
  this.elem.className = "tooltip";
  this.title.className = "title";
  this.type = Palette.createChild("div", this.elem);
  this.type.className = "type";
  this.body = Palette.createChild("div", this.elem);
  this.body.className = "body";
  this.hide();
}

Tooltip.prototype.show = function(source, event, title, type, body) {
  this.title.innerHTML = title;
  this.body.innerHTML = body;
  this.type.innerHTML = type;

  var getTopLeft = function(element) {
    var x = element.offsetLeft;
    var y = element.offsetTop;
    element = element.offsetParent;

    while(element != null) {
      x = parseInt(x) + parseInt(element.offsetLeft);
      y = parseInt(y) + parseInt(element.offsetTop);
      element = element.offsetParent;
    }
    return [y, x];
  }

  this.elem.style.height = source.style.height;
  this.elem.style.width = "280";
  var topLeft = getTopLeft(source);
  this.elem.style.top = parseInt(topLeft[0] + source.offsetHeight) + 'px';
  this.elem.style.left = parseInt(topLeft[1] + 10) + 'px';
  this.elem.style.visibility = "visible";
}

Tooltip.prototype.hide = function() {
  this.elem.style.visibility = "hidden";
}

Palette.prototype.create = function(document, parentElement) {
  var palette = this;

  var table = Palette.createChild("div", parentElement);
  table.className = "palette";
  table.width="300px";

  this.tooltip = new Tooltip();

  var row = Palette.createChild("div", table);
  row.style.visibility = "visible";
  row.className = "header";

  Palette.createChild("span", row).innerText = "Filter:";
  this.filterBar = Palette.createChild("input", Palette.createChild("span", row));
  this.filterBar.onkeyup = function() {
    palette.filter(palette.filterBar.value)
  };
  var go = document.createElement("button");
  Palette.createChild("span", row).appendChild(go);
  go.innerText = "Redraw"
  go.onclick = function() {
    palette.onchange();
  };

  for (var opt in opts) {
    try {
      if (opts.hasOwnProperty(opt)) {
        var type = opts[opt].type;
        var isFunction = type.indexOf("function(") == 0;
        var row = Palette.createChild("div", table);
        row.onmouseover = function(source, title, type, body, e) {
          return function(e) {
            palette.tooltip.show(source, e, title, type, body);
          };
        } (row, opt, type, Dygraph.OPTIONS_REFERENCE[opt].description);
        row.onmouseout = function() { palette.tooltip.hide(); };

        var div = Palette.createChild("span", row);
        div.innerText = opt;
        div.className = "name";

        var value = Palette.createChild("span", row);
        value.className = "option";

        if (isFunction) {
           var input = Palette.createChild("button", value);
           input.onclick = function(opt, palette) {
             return function(event) {
               var entry = palette.model[opt];
               var inputValue = entry.functionString;
               if (inputValue == null || inputValue.length == 0) {
                 inputValue = opts[opt].type + "{ }";
               }
               var value = prompt("enter function", inputValue);
               if (value != null) {
                 if (value.length == 0) {
                   value = null;
                 }
                 if (value != inputValue) {
                   entry.functionString = value;
                   entry.input.innerText = value ? "defined" : "not defined";
                   palette.onchange();
                 }
               }
             }
           }(opt, this);
        } else {
          var input = Palette.createChild("input", value);
          input.onkeypress = function(event) {
            var keycode = event.which;
            if (keycode == 13 || keycode == 8) {
              palette.onchange();
            }
          }

          input.type="text";
        }
        this.model[opt] = { input: input, row: row };
      }
    } catch(err) {
      throw "For option " + opt + ":" + err;
    }
  }
  this.filter("");
}

// TODO: replace semicolon parsing with comma parsing, and supporting quotes.
Palette.parseStringArray = function(value) {
  if (value == null || value.length == 0) {
    return null;
  }
  return value.split(";");
}

Palette.parseBooleanArray = function(value) {
  if (value == null || value.length == 0) {
    return null;
  }
  return value.split(',').map(function(x) { return x.trim() == "true"; });
}

Palette.parseFloatArray = function(value) {
  if (value == null || value.length == 0) {
    return null;
  }
  return value.split(',').map(function(x) { return parseFloat(x); });
}

Palette.parseIntArray = function(value) {
  if (value == null || value.length == 0) {
    return null;
  }
  return value.split(',').map(function(x) { return parseInt(x); });
}

Palette.prototype.read = function() {
  var results = {};
  for (var opt in this.model) {
    if (this.model.hasOwnProperty(opt)) {
      var type = opts[opt].type;
      var isFunction = type.indexOf("function(") == 0;
      var input = this.model[opt].input;
      var value = isFunction ? this.model[opt].functionString : input.value;
      if (value && value.length != 0) {
        if (type == "boolean") {
          results[opt] = value == "true";
        } else if (type == "int") {
          results[opt] = parseInt(value);
        } else if (type == "float") {
          results[opt] = parseFloat(value);
        } else if (type == "array<string>") {
          results[opt] = Palette.parseStringArray(value);
        } else if (type == "array<float>") {
          results[opt] = Palette.parseFloatArray(value);
        } else if (type == "array<boolean>") {
          results[opt] = Palette.parseBooleanArray(value);
        } else if (type == "array<Date>") {
          results[opt] = Palette.parseIntArray(value);
        } else if (isFunction) {
          var localVariable = null;
          eval("localVariable = " + value);
          results[opt] = localVariable;
        } else {
          results[opt] = value;
        }
      }
    }
  }
  return results;
}

/**
 * Write to input elements.
 */
Palette.prototype.write = function(hash) {
  var results = {};
  for (var opt in this.model) {
    //  && hash.hasOwnProperty(opt)
    if (this.model.hasOwnProperty(opt)) {
      var input = this.model[opt].input;
      var type = opts[opt].type;
      var value = hash[opt];
      if (type == "array<string>") {
        if (value) {
          input.value = value.join("; ");
        }
      } else if (type.indexOf("array") == 0) {
        if (value) {
          input.value = value.join(", ");
        }
      } else if (type.indexOf("function(") == 0) {
        input.innerText = value ? "defined" : "not defined";
        this.model[opt].functionString = value ? value.toString() : null;
      } else {
        if (value) {
          input.value = value;
        }
      }
    }
  }
}

Palette.prototype.filter = function(pattern) {
  pattern = pattern.toLowerCase();
  var even = true;
  for (var opt in this.model) {
    if (this.model.hasOwnProperty(opt)) {
      var row = this.model[opt].row;
      var matches = opt.toLowerCase().indexOf(pattern) >= 0;
      row.style.display = matches ? "block" : "none";
      if (matches) {
        row.className = even ? "even" : "odd";
        even = !even;
      }
    }
  }
}