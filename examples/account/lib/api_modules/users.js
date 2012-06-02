var ObjectId = require('mongodb').ObjectID

var Users = module.exports = function (options) {
  var self = this
  options = (options !== null && options !== undefined && options.constructor === Object) ? options : {}
  Object.keys(options).forEach(function (key) {
    if (!self.__proto__.hasOwnProperty(key)) {
      self[key] = options[key]
    }
  })
}

Users.prototype.signup = {
  post: function (request, response) {
    var self = this
    request.resume()
    request.once('end', function () {
      if (!self._isEmail(request.body.email)) {
        response.serveJSON({ success: false, error: 'invalid email ' + request.body.email })
        return
      }
      if (!self._isPassword(request.body.password)) {
        response.serveJSON({ success: false, error: 'invalid password' })
        return
      }
      self.collections.users.save({
        email: request.body.email,
        password: request.body.password
      }, function (err, document) {
        response.serveJSON({ success: true, user: document })
      })
    })
  }
}

Users.prototype.signin = {
  post: function (request, response) {
    var self = this
    request.resume()
    request.once('end', function () {
      self.collections.users.findOne({ email: request.body.email, password: request.body.password }, function (err, document) {
        if (err) {
          response.serveJSON({ success: false, error: err.message }, { httpStatusCode: 404 })
          return
        }
        if (!document) {
          response.serveJSON({ success: false, error: 'user not found' }, { httpStatusCode: 404 })
          return
        }
        response.serveJSON({ success: true }, {
          headers: {
            'set-cookie': 'session_id=' + document._id.toHexString()
          }
        })
      })
    })
  }
}

Users.prototype.list = {
  get: function (request, response) {
    var limit = Number(request.querystring.limit)
    var page = Number(request.querystring.page)
    var stream = this.collections.users.find({}, { limit: limit, skip: (page-1) * limit }).stream()
    stream.on('data', function(item) {
      response.streamJSON(item)
    })
    stream.on('close', function() {
      response.streamJSON()
    })
  }
}

Users.prototype.get = {
  get: function (request, response) {
    this.collections.users.findOne({ _id: new ObjectId(request.querystring.id) }, function (err, document) {
      if (err || !document) {
        response.serveJSON({ success: false, error: err.message })
        return
      }
      response.serveJSON({ success: true, user: document })
    })
  }
}

Users.prototype.delete = {
  post: function (request, response) {
    var self = this
    request.resume()
    request.once('end', function () {
      self.collections.users.remove({ _id: new ObjectId(request.body.id) }, { safe: true }, function (err, document) {
        if (err) {
          response.serveJSON({ success: false, error: err.message })
          return
        }
        response.serveJSON({ success: true, id: request.body.id })
      })
    })
  }
}
Users.prototype.delete.delete = Users.prototype.delete.post

Users.prototype._isEmail = function (email) {
  return /^([a-z0-9_\.\-])+\@(([a-z0-9\-])+\.)+([a-z0-9]{2,4})+$/.test(email)
}

Users.prototype._isPassword = function (email) {
  return /^.{6,22}$/.test(email)
}