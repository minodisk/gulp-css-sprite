through = require 'through2'
{ PluginError, File } = require 'gulp-util'
{ dirname, basename, extname, relative, join, resolve } = require 'path'
{ readdirSync } = require 'fs'
{ isObject, isNumber, isString, clone, merge } = require 'lodash'
spritesmith = require 'spritesmith'

PLUGIN_NAME = 'gulp-css-cache-bust'

EXTNAMES = [
  '.png'
  '.jpg'
  '.jpeg'
  '.gif'
]

defOpts =
  cssFormat: 'css'
  srcBase: 'sprite'
  destBase: ''
  imageFormat: 'png'
  withMixin: true
  spritesmith: {}

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
    map.push "'#{key}': #{val}"
  "(#{map.join ', '})"

mixin = (cssFormat) ->
  switch cssFormat
    when 'scss'
      """
      @mixin sprite($filepath, $scale: 1) {
        $image-map: map-get($sprite-map, $filepath);
        width: map-get($image-map, 'width') * $scale;
        height: map-get($image-map, 'height') * $scale;
        background: url(map-get($image-map, 'url')) no-repeat;
        background-position: map-get($image-map, 'x') * $scale map-get($image-map, 'y') * $scale;
        @if $scale != 1 {
          -webkit-background-size: map-get($image-map, 'imageWidth') * $scale map-get($image-map, 'imageHeight') * $scale;
          -moz-background-size: map-get($image-map, 'imageWidth') * $scale map-get($image-map, 'imageHeight') * $scale;
          -o-background-size: map-get($image-map, 'imageWidth') * $scale map-get($image-map, 'imageHeight') * $scale;
          background-size: map-get($image-map, 'imageWidth') * $scale map-get($image-map, 'imageHeight') * $scale;
        }
      }
      @mixin sprite-retina($filepath) {
        @include sprite($filepath, 0.5)
      }
      """
    else
      ""

getName = (filename) ->
  basename filename, extname filename

sprite = (opts = {}) ->
  opts = merge clone(defOpts), opts

  files = []
  doneGroups = []
  spriteMap = {}

  getGroup = (filename) ->
    relative opts.srcBase, dirname filename

  through
    objectMode: true
  , (file, enc, callback) ->
    if file.isNull()
      @push file
      callback()
      return

    if file.isBuffer()
      # group = getGroup relative '', file.path
      # group = getGroup file.path

      group = dirname file.path
      if doneGroups.indexOf(group) isnt -1
        callback()
        return
      doneGroups.push group

      srcParentDir = relative '', dirname file.path
      srcImageFilenames = for srcImageFilename in readdirSync srcParentDir when extname(srcImageFilename).toLowerCase() in EXTNAMES
        join srcParentDir, srcImageFilename
      srcImageFilenames.sort()

      spritesmith merge(clone(opts.spritesmith), src: srcImageFilenames)
      , (err, result) =>
        throw new PluginError PLUGIN_NAME, err if err?

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
        # spriteMap[group] = { imageWidth, imageHeight, url }
        for filename, { x, y, width, height } of coordinates
          # group = getGroup filename
          # name = getName filename
          # spriteMap[group][name] = { x: -x, y: -y, width, height }
          relativeFilename = relative opts.srcBase, filename
          spriteMap[relativeFilename] = { x: -x, y: -y, width, height, imageWidth, imageHeight, url }

        callback()

    throw new PluginError PLUGIN_NAME, 'Stream is not supported' if file.isStream()
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
