through = require 'through2'
{ PluginError, File } = require 'gulp-util'
# { PassThrough } = require 'stream'
{ cloneextend } = require 'cloneextend'
{ dirname, basename, extname, resolve, relative, join } = require 'path'
{ readdirSync } = require 'fs'
# { createReadStream } = require 'fs'
{ createHash } = require 'crypto'
spritesmith = require 'spritesmith'
{ isNumber, isString } = require 'lodash'

PLUGIN_NAME = 'gulp-css-cache-bust'

defOpts =
  cssFormat: 'css'
  srcBase: 'sprite'
  destBase: ''
  imageFormat: 'png'
  # relativeBase: null
  withMixin: true

propertyOrder = [ 'x', 'y', 'width', 'height', 'imageWidth', 'imageHeight', 'url']
getPropertyIndex = (prop) -> 1 + propertyOrder.indexOf prop
getOrderedProperties = (props) ->
  for prop in propertyOrder
    value = props[prop]
    if isNumber value
      value += 'px'
    else if isString value
      value = "'#{value}'"
    value

mixin = (cssFormat) ->
  switch cssFormat
    when 'scss'
      """
      @mixin sprite($group, $name) {
        $id: '$' + $group + $name;
        width: nth($id, #{getPropertyIndex 'width'});
        height: nth($id, #{getPropertyIndex 'height'});
        background: url('nth($id, #{getPropertyIndex 'url'})') no-repeat;
        background-position: nth($id, #{getPropertyIndex 'x'}) nth($id, #{getPropertyIndex 'y'});
      }
      @mixin sprite-retina($group, $name) {
        $id: '$' + $group + $name;
        width: nth($id, #{getPropertyIndex 'width'})/2;
        height: nth($id, #{getPropertyIndex 'height'})/2;
        background: url('nth($id, #{getPropertyIndex 'url'})') no-repeat;
        background-position: nth($id, #{getPropertyIndex 'x'})/2 nth($id, #{getPropertyIndex 'y'})/2;
        background-size: nth($id, #{getPropertyIndex 'imageWidth'})/2 nth($id, #{getPropertyIndex 'imageHeight'})/2;
      }
      """
    else
      ""

sprite = (opts = {}) ->
  opts = cloneextend defOpts, opts

  srcBases = []

  through.obj (file, enc, callback) ->
    if file.isNull()
      @push file
      callback()
      return

    if file.isBuffer()
      srcBase = relative '', dirname file.path
      if srcBase in srcBases
        callback()
        return
      srcBases.push srcBase

      filenames = for filename in readdirSync srcBase
        join srcBase, filename

      spritesmith
        src: filenames
      , (err, result) =>
        { coordinates, properties: { width: imageWidth, height: imageHeight }, image } = result

        csses = for url, { x, y, width, height } of coordinates
          name = basename url, extname url
          url = dirname url
          group = url.split('/').pop()
          url += ".#{opts.imageFormat}"
          url = relative opts.srcBase, url

          imageFile = new File
          imageFile.path = url
          imageFile.contents = new Buffer image, 'binary'
          @push imageFile

          #TODO support relative
          # if opts.relativeBase?
          #   basename pathFromProjectRoot
          # else
          url = "/#{url}"

          x *= -1
          y *= -1
          properties = getOrderedProperties { x, y, width, height, imageWidth, imageHeight, url }

          switch opts.cssFormat
            when 'scss'
              "$#{group}-#{name}: #{properties.join ' '};"
            else
              "" #TODO implement

        if opts.withMixin
          csses.push mixin opts.cssFormat

        cssFile = new File
        cssFile.path = "sprite.#{opts.cssFormat}"
        cssFile.contents = new Buffer csses.join '\n'
        @push cssFile

        callback()

    throw new PluginError 'Stream is not supported' if file.isStream()

sprite.mixin = (opts) ->

  through.obj (file, enc, callback) ->
    if file.isNull()
      @push file
      callback()
      return

    if file.isBuffer()
      file.contents = new Buffer file.contents + '\n' + mixin opts.cssFormat
      @push file
      callback()

    throw new PluginError 'Stream is not supported' if file.isStream()

module.exports = sprite
