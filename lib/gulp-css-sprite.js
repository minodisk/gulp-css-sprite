var CSS_EXT_MAP, EXTNAMES, File, PLUGIN_NAME, PluginError, basename, clone, defOpts, dirname, extname, getName, isNumber, isObject, isString, join, log, merge, mixin, objectToSCSSMap, objectToStylusHash, readdirSync, relative, resolve, sprite, spritesmith, through, _ref, _ref1, _ref2,
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

through = require('through2');

_ref = require('gulp-util'), PluginError = _ref.PluginError, File = _ref.File;

_ref1 = require('path'), dirname = _ref1.dirname, basename = _ref1.basename, extname = _ref1.extname, relative = _ref1.relative, join = _ref1.join, resolve = _ref1.resolve;

readdirSync = require('fs').readdirSync;

_ref2 = require('lodash'), isObject = _ref2.isObject, isNumber = _ref2.isNumber, isString = _ref2.isString, clone = _ref2.clone, merge = _ref2.merge;

spritesmith = require('spritesmith');

PLUGIN_NAME = 'gulp-css-sprite';

EXTNAMES = ['.png', '.jpg', '.jpeg', '.gif'];

CSS_EXT_MAP = {
  'stylus': '.styl',
  'scss': '.scss'
};

log = function(task, action, path) {
  return gutil.log("" + (gutil.colors.cyan(task)) + ": [" + (gutil.colors.blue(action)) + "] " + (gutil.colors.magenta(path)));
};

defOpts = {
  cssFormat: 'stylus',
  srcBase: 'sprite',
  destBase: '',
  imageFormat: 'png',
  withMixin: true,
  spritesmith: {}
};

objectToStylusHash = function(obj) {
  return JSON.stringify(obj, null, 2);
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
    case 'stylus':
      return "sprite(filepath, scale = 1)\n  image-hash = sprite-hash[filepath]\n  width: (image-hash.width * scale)px\n  height: (image-hash.height * scale)px\n  url = image-hash.url\n  background: url(url) no-repeat\n  background-position: (image-hash.x * scale)px (image-hash.y * scale)px\n  if scale != 1\n    background-size: (image-hash.imageWidth * scale)px, (image-hash.imageHeight * scale)px\nsprite-retina(filepath)\n  sprite filepath, 0.5";
    case 'scss':
      return "@mixin sprite($filepath, $scale: 1) {\n  $image-map: map-get($sprite-map, $filepath);\n  width: map-get($image-map, 'width') * $scale;\n  height: map-get($image-map, 'height') * $scale;\n  background: url(map-get($image-map, 'url')) no-repeat;\n  background-position: map-get($image-map, 'x') * $scale map-get($image-map, 'y') * $scale;\n  @if $scale != 1 {\n    -webkit-background-size: map-get($image-map, 'imageWidth') * $scale map-get($image-map, 'imageHeight') * $scale;\n    -moz-background-size: map-get($image-map, 'imageWidth') * $scale map-get($image-map, 'imageHeight') * $scale;\n    -o-background-size: map-get($image-map, 'imageWidth') * $scale map-get($image-map, 'imageHeight') * $scale;\n    background-size: map-get($image-map, 'imageWidth') * $scale map-get($image-map, 'imageHeight') * $scale;\n  }\n}\n@mixin sprite-retina($filepath) {\n  @include sprite($filepath, 0.5)\n}";
    default:
      return "";
  }
};

getName = function(filename) {
  return basename(filename, extname(filename));
};

sprite = function(opts) {
  var doneGroups, files, getGroup, objectToHash, spriteMap;
  if (opts == null) {
    opts = {};
  }
  opts = merge(clone(defOpts), opts);
  files = [];
  doneGroups = [];
  spriteMap = {};
  objectToHash = (function() {
    switch (opts.cssFormat) {
      case 'stylus':
        return function(data) {
          return "sprite-hash = " + (objectToStylusHash(data));
        };
      case 'scss':
        return function(data) {
          return "$sprite-map: " + (objectToSCSSMap(data));
        };
    }
  })();
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
      path: "sprite" + CSS_EXT_MAP[opts.cssFormat],
      contents: new Buffer("" + (objectToHash(spriteMap)) + ";\n" + (mixin(opts.cssFormat)) + "\n")
    }));
    this.emit('end');
    return callback();
  });
};

module.exports = sprite;
