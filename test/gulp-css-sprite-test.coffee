expect = require 'expect'
sprite = require '../lib/gulp-css-sprite'
{ File } = require 'gulp-util'
{ PassThrough } = require 'stream'
es = require 'event-stream'
{ clone } = require 'cloneextend'
{ resolve } = require 'path'

describe 'gulp-css-sprite', ->

  describe 'in buffer mode', ->

    it "should create css", (done) ->
      stream = sprite()
      stream.on 'data', (file) ->
        console.log file
      stream.on 'end', ->
        console.log 'end'
        done()
      stream.write new File path: resolve 'fixtures/sprites/images/circle/blue.png'
      stream.write new File path: resolve 'fixtures/sprites/images/circle/green.png'
      stream.write new File path: resolve 'fixtures/sprites/images/circle/red.png'
      stream.end()
