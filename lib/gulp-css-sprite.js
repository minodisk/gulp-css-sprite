var File, PLUGIN_NAME, PluginError, basename, cloneextend, defOpts, dirname, extname, getOrderedProperties, getPropertyIndex, isNumber, isString, join, mixin, propertyOrder, readdirSync, relative, resolve, sprite, spritesmith, through, _ref, _ref1, _ref2,
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };
through = require('through2');
_ref = require('gulp-util'), PluginError = _ref.PluginError, File = _ref.File;
cloneextend = require('cloneextend').cloneextend;
_ref1 = require('path'), dirname = _ref1.dirname, basename = _ref1.basename, extname = _ref1.extname, resolve = _ref1.resolve, relative = _ref1.relative, join = _ref1.join;
readdirSync = require('fs').readdirSync;
spritesmith = require('spritesmith');
_ref2 = require('lodash'), isNumber = _ref2.isNumber, isString = _ref2.isString;
PLUGIN_NAME = 'gulp-css-cache-bust';
defOpts = {
  cssFormat: 'css',
  srcBase: 'sprite',
  destBase: '',
  imageFormat: 'png',
  withMixin: true
};
propertyOrder = ['x', 'y', 'width', 'height', 'imageWidth', 'imageHeight', 'url'];
getPropertyIndex = function(prop) {
  return 1 + propertyOrder.indexOf(prop);
};
getOrderedProperties = function(props) {
  var prop, value, _i, _len, _results;
  _results = [];
  for (_i = 0, _len = propertyOrder.length; _i < _len; _i++) {
    prop = propertyOrder[_i];
    value = props[prop];
    if (isNumber(value)) {
      value += 'px';
    } else if (isString(value)) {
      value = "'" + value + "'";
    }
    _results.push(value);
  }
  return _results;
};
mixin = function(cssFormat) {
  switch (cssFormat) {
    case 'scss':
      return "@mixin sprite($group, $name) {\n  $id: '$' + $group + $name;\n  width: nth($id, " + (getPropertyIndex('width')) + ");\n  height: nth($id, " + (getPropertyIndex('height')) + ");\n  background: url('nth($id, " + (getPropertyIndex('url')) + ")') no-repeat;\n  background-position: nth($id, " + (getPropertyIndex('x')) + ") nth($id, " + (getPropertyIndex('y')) + ");\n}\n@mixin sprite-retina($group, $name) {\n  $id: '$' + $group + $name;\n  width: nth($id, " + (getPropertyIndex('width')) + ")/2;\n  height: nth($id, " + (getPropertyIndex('height')) + ")/2;\n  background: url('nth($id, " + (getPropertyIndex('url')) + ")') no-repeat;\n  background-position: nth($id, " + (getPropertyIndex('x')) + ")/2 nth($id, " + (getPropertyIndex('y')) + ")/2;\n  background-size: nth($id, " + (getPropertyIndex('imageWidth')) + ")/2 nth($id, " + (getPropertyIndex('imageHeight')) + ")/2;\n}";
    default:
      return "";
  }
};
sprite = function(opts) {
  var srcBases;
  if (opts == null) {
    opts = {};
  }
  opts = cloneextend(defOpts, opts);
  srcBases = [];
  return through.obj(function(file, enc, callback) {
    var filename, filenames, srcBase;
    if (file.isNull()) {
      this.push(file);
      callback();
      return;
    }
    if (file.isBuffer()) {
      srcBase = relative('', dirname(file.path));
      if (__indexOf.call(srcBases, srcBase) >= 0) {
        callback();
        return;
      }
      srcBases.push(srcBase);
      filenames = (function() {
        var _i, _len, _ref3, _results;
        _ref3 = readdirSync(srcBase);
        _results = [];
        for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
          filename = _ref3[_i];
          _results.push(join(srcBase, filename));
        }
        return _results;
      })();
      spritesmith({
        src: filenames
      }, (function(_this) {
        return function(err, result) {
          var coordinates, cssFile, csses, group, height, image, imageFile, imageHeight, imageWidth, name, properties, url, width, x, y, _ref3;
          coordinates = result.coordinates, (_ref3 = result.properties, imageWidth = _ref3.width, imageHeight = _ref3.height), image = result.image;
          csses = (function() {
            var _ref4, _results;
            _results = [];
            for (url in coordinates) {
              _ref4 = coordinates[url], x = _ref4.x, y = _ref4.y, width = _ref4.width, height = _ref4.height;
              name = basename(url, extname(url));
              url = dirname(url);
              group = url.split('/').pop();
              url += "." + opts.imageFormat;
              url = relative(opts.srcBase, url);
              imageFile = new File;
              imageFile.path = url;
              imageFile.contents = new Buffer(image, 'binary');
              this.push(imageFile);
              url = "/" + url;
              x *= -1;
              y *= -1;
              properties = getOrderedProperties({
                x: x,
                y: y,
                width: width,
                height: height,
                imageWidth: imageWidth,
                imageHeight: imageHeight,
                url: url
              });
              switch (opts.cssFormat) {
                case 'scss':
                  _results.push("$" + group + "-" + name + ": " + (properties.join(' ')) + ";");
                  break;
                default:
                  _results.push("");
              }
            }
            return _results;
          }).call(_this);
          if (opts.withMixin) {
            csses.push(mixin(opts.cssFormat));
          }
          cssFile = new File;
          cssFile.path = "sprite." + opts.cssFormat;
          cssFile.contents = new Buffer(csses.join('\n'));
          _this.push(cssFile);
          return callback();
        };
      })(this));
    }
    if (file.isStream()) {
      throw new PluginError('Stream is not supported');
    }
  });
};
sprite.mixin = function(opts) {
  return through.obj(function(file, enc, callback) {
    if (file.isNull()) {
      this.push(file);
      callback();
      return;
    }
    if (file.isBuffer()) {
      file.contents = new Buffer(file.contents + '\n' + mixin(opts.cssFormat));
      this.push(file);
      callback();
    }
    if (file.isStream()) {
      throw new PluginError('Stream is not supported');
    }
  });
};
module.exports = sprite;
