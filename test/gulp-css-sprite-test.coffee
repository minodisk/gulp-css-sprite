require('chai').should()
sprite = require '../lib/gulp-css-sprite'
{ File } = require 'gulp-util'
{ PassThrough } = require 'stream'
{ resolve, join, extname } = require 'path'
{ readFileSync } = require 'fs'


createFile = (path) ->
  path = join __dirname, './fixtures', path
  new File
    path: path
    contents: readFileSync path


describe 'gulp-css-sprite', ->

  describe 'in buffer mode', ->

    it "should create scss", (done) ->
      stream = sprite
        cssFormat: 'scss'
        srcBase: resolve __dirname, 'fixtures/sprite'
      stream.on 'data', (file) ->
        switch extname file.path
          when '.png'
            file.relative.should.equal 'images/circle.png'
          when '.scss'
            file.contents.toString().should.equal """
$sprite-map: ('images/circle/blue.png': ('x': 0, 'y': 0, 'width': 32px, 'height': 32px, 'imageWidth': 32px, 'imageHeight': 96px, 'url': '/images/circle.png'), 'images/circle/green.png': ('x': 0, 'y': -32px, 'width': 32px, 'height': 32px, 'imageWidth': 32px, 'imageHeight': 96px, 'url': '/images/circle.png'), 'images/circle/red.png': ('x': 0, 'y': -64px, 'width': 32px, 'height': 32px, 'imageWidth': 32px, 'imageHeight': 96px, 'url': '/images/circle.png'));
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
      stream.once 'end', ->
        done()
      stream.write createFile 'sprite/images/circle/blue.png'
      stream.write createFile 'sprite/images/circle/green.png'
      stream.write createFile 'sprite/images/circle/red.png'
      stream.end()

    it "should create stylus", (done) ->
      stream = sprite
        cssFormat: 'stylus'
        srcBase: resolve __dirname, 'fixtures/sprite'
      stream.on 'data', (file) ->
        switch extname file.path
          when '.png'
            file.relative.should.equal 'images/circle.png'
          when '.stylus'
            file.contents.toString().should.equal """
sprite-hash = {
  'images/circle/blue.png': {
    'x': 0,
    'y': 0,
    'width': 32px,
    'height': 32px,
    'imageWidth': 32px,
    'imageHeight': 96px,
    'url': '/images/circle.png'
  },
  'images/circle/green.png': {
    'x': 0,
    'y': -32px,
    'width': 32px,
    'height': 32px,
    'imageWidth': 32px,
    'imageHeight': 96px,
    'url': '/images/circle.png'
  },
  'images/circle/red.png': {
    'x': 0,
    'y': -64px,
    'width': 32px,
    'height': 32px,
    'imageWidth': 32px,
    'imageHeight': 96px,
    'url': '/images/circle.png'
  }
}
sprite(filepath, scale = 1)
  image-hash = sprite-hash[filepath]
  width = image-hash.widgh * scale
  height = image-hash.height * scale
  background url(image-hash.url) no-repeat
  background-size image-map.imageWidth * scale, image-map.imageHeight * scale
sprite-retina(filepath)
  @include sprite filepath, 0.5

            """
      stream.once 'end', ->
        console.log 'end---------'
        done()
      stream.write createFile 'sprite/images/circle/blue.png'
      stream.write createFile 'sprite/images/circle/green.png'
      stream.write createFile 'sprite/images/circle/red.png'
      stream.end()
