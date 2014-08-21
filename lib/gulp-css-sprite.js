var EXTNAMES, File, PLUGIN_NAME, PluginError, basename, clone, defOpts, dirname, extname, getName, isNumber, isObject, isString, join, merge, mixin, objectToSCSSMap, readdirSync, relative, resolve, sprite, spritesmith, through, _ref, _ref1, _ref2,
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };
through = require('through2');
_ref = require('gulp-util'), PluginError = _ref.PluginError, File = _ref.File;
_ref1 = require('path'), dirname = _ref1.dirname, basename = _ref1.basename, extname = _ref1.extname, relative = _ref1.relative, join = _ref1.join, resolve = _ref1.resolve;
readdirSync = require('fs').readdirSync;
_ref2 = require('lodash'), isObject = _ref2.isObject, isNumber = _ref2.isNumber, isString = _ref2.isString, clone = _ref2.clone, merge = _ref2.merge;
spritesmith = require('spritesmith');
PLUGIN_NAME = 'gulp-css-cache-bust';
EXTNAMES = ['.png', '.jpg', '.jpeg', '.gif'];
defOpts = {
  cssFormat: 'css',
  srcBase: 'sprite',
  destBase: '',
  imageFormat: 'png',
  withMixin: true,
  spritesmith: {}
};
objectToSCSSMap = function(obj) {
  var key, map, val;
  map = [];
  for (key in obj) {
    val = obj[key];
    if (isObject(val)) {
      val = objectToSCSSMap(val);
    } else if (isNumber(val)) {
      if (val !== 0) {
        val = "" + val + "px";
      }
    } else if (isString(val)) {
      val = "'" + val + "'";
    }
    map.push("'" + key + "': " + val);
  }
  return "(" + (map.join(', ')) + ")";
};
mixin = function(cssFormat) {
  switch (cssFormat) {
    case 'scss':
      return "@mixin sprite($filepath) {\n  $image-map: map-get($sprite-map, $filepath);\n  width: map-get($image-map, 'width');\n  height: map-get($image-map, 'height');\n  background: url(map-get($image-map, 'url')) no-repeat;\n  background-position: map-get($image-map, 'x') map-get($image-map, 'y');\n}\n@mixin sprite-retina($filepath) {\n  $image-map: map-get($sprite-map, $filepath);\n  width: map-get($image-map, 'width')/2;\n  height: map-get($image-map, 'height')/2;\n  background: url(map-get($image-map, 'url')) no-repeat;\n  background-position: map-get($image-map, 'x')/2 map-get($image-map, 'y')/2;\n  -webkit-background-size: map-get($image-map, 'imageWidth')/2 map-get($image-map, 'imageHeight')/2;\n  -moz-background-size: map-get($image-map, 'imageWidth')/2 map-get($image-map, 'imageHeight')/2;\n  -o-background-size: map-get($image-map, 'imageWidth')/2 map-get($image-map, 'imageHeight')/2;\n  background-size: map-get($image-map, 'imageWidth')/2 map-get($image-map, 'imageHeight')/2;\n}";
    default:
      return "";
  }
};
getName = function(filename) {
  return basename(filename, extname(filename));
};
sprite = function(opts) {
  var doneGroups, files, getGroup, spriteMap;
  if (opts == null) {
    opts = {};
  }
  opts = merge(clone(defOpts), opts);
  files = [];
  doneGroups = [];
  spriteMap = {};
  getGroup = function(filename) {
    return relative(opts.srcBase, dirname(filename));
  };
  return through({
    objectMode: true
  }, function(file, enc, callback) {
    var group, srcImageFilename, srcImageFilenames, srcParentDir;
    if (file.isNull()) {
      this.push(file);
      callback();
      return;
    }
    if (file.isBuffer()) {
      group = dirname(file.path);
      if (doneGroups.indexOf(group) !== -1) {
        callback();
        return;
      }
      doneGroups.push(group);
      srcParentDir = relative('', dirname(file.path));
      srcImageFilenames = (function() {
        var _i, _len, _ref3, _ref4, _results;
        _ref3 = readdirSync(srcParentDir);
        _results = [];
        for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
          srcImageFilename = _ref3[_i];
          if (_ref4 = extname(srcImageFilename).toLowerCase(), __indexOf.call(EXTNAMES, _ref4) >= 0) {
            _results.push(join(srcParentDir, srcImageFilename));
          }
        }
        return _results;
      })();
      srcImageFilenames.sort();
      spritesmith(merge(clone(opts.spritesmith), {
        src: srcImageFilenames
      }), (function(_this) {
        return function(err, result) {
          var coordinates, filename, height, image, imageFile, imageHeight, imageWidth, relativeFilename, relativeFilenameFromBase, url, width, x, y, _ref3, _ref4;
          if (err != null) {
            throw new PluginError(PLUGIN_NAME, err);
          }
          coordinates = result.coordinates, (_ref3 = result.properties, imageWidth = _ref3.width, imageHeight = _ref3.height), image = result.image;
          relativeFilenameFromBase = relative(opts.srcBase, "" + srcParentDir + "." + opts.imageFormat);
          imageFile = new File;
          imageFile.path = relativeFilenameFromBase;
          imageFile.contents = new Buffer(image, 'binary');
          _this.push(imageFile);
          url = "/" + relativeFilenameFromBase;
          for (filename in coordinates) {
            _ref4 = coordinates[filename], x = _ref4.x, y = _ref4.y, width = _ref4.width, height = _ref4.height;
            relativeFilename = relative(opts.srcBase, filename);
            spriteMap[relativeFilename] = {
              x: -x,
              y: -y,
              width: width,
              height: height,
              imageWidth: imageWidth,
              imageHeight: imageHeight,
              url: url
            };
          }
          return callback();
        };
      })(this));
    }
    if (file.isStream()) {
      throw new PluginError(PLUGIN_NAME, 'Stream is not supported');
    }
  }, function(callback) {
    this.push(new File({
      path: "_sprite." + opts.cssFormat,
      contents: new Buffer("$sprite-map: " + (objectToSCSSMap(spriteMap)) + ";\n" + (mixin(opts.cssFormat)) + "\n")
    }));
    this.emit('end');
    return callback();
  });
};
module.exports = sprite;
