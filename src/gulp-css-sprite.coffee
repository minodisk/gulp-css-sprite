through = require 'through2'
{ PluginError, File } = require 'gulp-util'
{ dirname, basename, extname, relative, join } = require 'path'
{ readdirSync } = require 'fs'
{ isObject, isNumber, isString, clone, merge } = require 'lodash'
spritesmith = require 'spritesmith'

PLUGIN_NAME = 'gulp-css-cache-bust'

defOpts =
  cssFormat: 'css'
  srcBase: 'sprite'
  destBase: ''
  imageFormat: 'png'
  withMixin: true

objectToSCSSMap = (obj) ->
  map = []
  for key, val of obj
    if isObject val
      val = objectToSCSSMap val
    else if isNumber val
      if val isnt 0
        val = "#{val}px"
    else if isString val
      val = "'#{val}'"
    map.push "#{key}: #{val}"
  "(#{map.join ', '})"

mixin = (cssFormat) ->
  switch cssFormat
    when 'scss'
      """
      @mixin sprite($group, $name) {
        $group-data: map-get($sprite-map, $group);
        $sprite-data: map-get($group-data, $name);
        width: map-get($sprite-data, 'width');
        height: map-get($sprite-data, 'height');
        background: url(map-get($group-data, 'url')) no-repeat;
        background-position: map-get($sprite-data, 'x') map-get($sprite-data, 'y');
      }
      @mixin sprite-retina($group, $name) {
        $group-data: map-get($sprite-map, $group);
        $sprite-data: map-get($group-data, $name);
        width: map-get($sprite-data, 'width')/2;
        height: map-get($sprite-data, 'height')/2;
        background: url(map-get($group-data, 'url')) no-repeat;
        background-position: map-get($sprite-data, 'x')/2 map-get($sprite-data, 'y')/2;
        -webkit-background-size: map-get($group-data, 'imageWidth')/2 map-get($group-data, 'imageHeight')/2;
        -moz-background-size: map-get($group-data, 'imageWidth')/2 map-get($group-data, 'imageHeight')/2;
        -o-background-size: map-get($group-data, 'imageWidth')/2 map-get($group-data, 'imageHeight')/2;
        background-size: map-get($group-data, 'imageWidth')/2 map-get($group-data, 'imageHeight')/2;
      }
      """
    else
      ""

getGroup = (filename) ->
  dirname(filename).split('/').pop()

getName = (filename) ->
  basename filename, extname filename

sprite = (opts = {}) ->
  opts = merge clone(defOpts), opts

  files = []
  spriteMap = {}

  through
    objectMode: true
  , (file, enc, callback) ->
    if file.isNull()
      @push file
      callback()
      return

    if file.isBuffer()
      group = getGroup file.path
      if spriteMap[group]
        callback()
        return
      spriteMap[group] = true

      srcParentDir = relative '', dirname file.path
      srcImageFilenames = for srcImageFilename in readdirSync srcParentDir
        join srcParentDir, srcImageFilename

      spritesmith
        src: srcImageFilenames
      , (err, result) =>
        throw new PluginError err if err?

        { coordinates, properties: { width: imageWidth, height: imageHeight }, image } = result

        relativeFilenameFromBase = relative opts.srcBase, "#{srcParentDir}.#{opts.imageFormat}"
        imageFile = new File
        imageFile.path = relativeFilenameFromBase
        imageFile.contents = new Buffer image, 'binary'
        @push imageFile

        #TODO support relative
        # if opts.relativeBase?
        #   basename pathFromProjectRoot
        # else
        url = "/#{relativeFilenameFromBase}"
        spriteMap[group] = { imageWidth, imageHeight, url }
        for filename, { x, y, width, height } of coordinates
          group = getGroup filename
          name = getName filename
          spriteMap[group][name] = { x: -x, y: -y, width, height }

        callback()

    throw new PluginError 'Stream is not supported' if file.isStream()
  , (callback) ->
    @push new File
      path: "_sprite.#{opts.cssFormat}"
      contents: new Buffer """
      $sprite-map: #{objectToSCSSMap spriteMap};
      #{mixin opts.cssFormat}

      """
    @emit 'end'
    callback()

module.exports = sprite
