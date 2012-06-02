var ObjectId = require('mongodb').ObjectID,
    fs = require('fs'),
    crypto = require('crypto'),
    path = require('path')

var Photos = module.exports = function (options) {
  var self = this
  options = (options !== null && options !== undefined && options.constructor === Object) ? options : {}
  Object.keys(options).forEach(function (key) {
    if (!self.__proto__.hasOwnProperty(key)) {
      self[key] = options[key]
    }
  })
}

Photos.prototype.index = {
  get: function (request, response) {
    var limit = Number(request.querystring.limit)
    var page = Number(request.querystring.page)
    this.collections.photos.find({}, { sort: { _id: -1 }, limit: limit, skip: (page-1) * limit }).stream().on('data', function(item) {
      response.streamJSON(item)
    }).once('close', function() {
      response.streamJSON()
    })
  },
  post: function (request, response) {
    var self = this
    var photo = {}
    request.resume()
    request.form.uploadDir = self.uploadTempPath
    request.form.once('end', function () {
      var file = request.files.photo
      photo.filename = getUniqueFilename(file.name)
      photo.title = request.body.title
      photo.caption = request.body.caption
      photo.likes = 0
      fs.rename(file.path, self.uploadPath + '/' + photo.filename, function (err) {
        if (err) {
          throw err
        }
        self.collections.photos.save(photo, function (err, document) {
          response.serveJSON({ success: true, photo: photo })
        })
      })
    })
  }
}

Photos.prototype.photo = {
  get: function (request, response) {
    this.collections.photos.findOne({ _id: new ObjectId(request.querystring.id) }, function (err, document) {
      if (!err && !document) {
        err = new Error('document ' + request.querystring.id + ' not found')
      }
      if (err) {
        response.serveJSON({ success: false, error: err.msg || err.message })
        return
      }
      response.serveJSON({ success: true, user: document })
    })
  },
  delete: function (request, response) {
    var self = this
    request.resume()
    request.once('end', function () {
      self.collections.photos.findAndRemove({ _id: new ObjectId(request.querystring.id) }, [], { safe: true }, function (err, document) {
        if (!err && !document) {
          err = new Error('document ' + request.querystring.id + ' not found')
        }
        if (err) {
          response.serveJSON({ success: false, error: err.msg || err.message })
          return
        }
        fs.unlink(self.uploadPath + '/' + document.filename, function () {
          response.serveJSON({ success: true, id: request.body.id })
        })
      })
    })
  },
  put: function (request, response) {
    var self = this
    request.resume()
    request.once('end', function () {
      self.collections.photos.findAndModify({ _id: new ObjectId(request.querystring.id) }, [], { $inc: { likes: 1 } }, { new: true }, function (err, document) {
        if (!err && !document) {
          err = new Error('document ' + request.querystring.id + ' not found')
        }
        if (err) {
          response.serveJSON({ success: false, error: err.msg || err.message })
          return
        }
        response.serveJSON({ success: true, photo: document })
      })
    })
  },
  // fix for browsers that only allow GET / POST
  post: function (request, response) {
    if (request.querystring.action === 'delete') {
      this.photo.delete.apply(this, arguments)
    } else if (request.querystring.action === 'put') {
      this.photo.put.apply(this, arguments)
    } else {
      response.serveJSON()
    }
  }
}

function getUniqueFilename(filename) {
  var extename = path.extname(filename)
  var hash = crypto.createHash('sha1')
  hash.update(new Buffer(new Date().getTime().toString()))
  return hash.digest('hex') + extename
}