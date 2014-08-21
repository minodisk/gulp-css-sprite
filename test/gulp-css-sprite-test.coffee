expect = require 'expect'
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

    it "should create css", (done) ->
      stream = sprite srcBase: resolve __dirname, 'fixtures/sprite'
      stream.on 'data', (file) ->
        switch extname file.path
          when '.png'
            console.log file
          when '.css'
            console.log file.contents.toString()
      stream.on 'end', ->
        done()
      stream.write createFile 'sprite/images/circle/blue.png'
      stream.write createFile 'sprite/images/circle/green.png'
      stream.write createFile 'sprite/images/circle/red.png'
      stream.end()
