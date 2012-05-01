var http = require('http'),
    url = require('url'),
    qs = require('qs'),
    util = require('util'),
    events = require('events'),
    bufferedRequest = require('buffered-request'),
    middleware = require('./middleware'),
    Router = require('apiserver-router'),
    Chain = require('fnchain')

var ApiServer = module.exports = function (options) {
  var self = this
  ApiServer.super_.call(this)

  options = (options !== null && options !== undefined && options.constructor === Object) ? options : {}
  options.timeout = !options.timeout || options.timeout < 0 ? 15000 : options.timeout
  options.standardHeaders = options.standardHeaders || {
    'cache-control': 'max-age=0, no-cache, no-store, must-revalidate',
    'expires': 0,
    'pragma': 'no-cache',
    'x-server': 'ApiServer v' + ApiServer.version + ' raging on nodejs ' + process.version
  }
  options.port = options.port || 8080
  options.server = options.server || http.createServer()
  options.router = options.router || new Router()

  Object.keys(options).forEach(function (key) {
    if (!self.__proto__.hasOwnProperty(key)) {
      self[key] = options[key]
    }
  })

  this.JSONTransport = middleware.JSONTransport(this, options)
  this.middlewareList = []
  this.activeApiModules = {}
  this.server.on('request', onRequest.bind(this))
}

module.exports.version = require('../package').version

util.inherits(module.exports, events.EventEmitter)

ApiServer.prototype.addModule = function (version, moduleName, apiModule) {
  if (this.activeApiModules[version] === undefined) {
    this.activeApiModules[version] = Object.create(null)
  }
  this.activeApiModules[version][moduleName] = apiModule
  this.router.update(this.activeApiModules, this.middlewareList)
  return this
}

ApiServer.prototype.use = function (route, middleware) {
  this.middlewareList.push({
    route: route,
    handle: middleware
  })
  this.router.update(this.activeApiModules, this.middlewareList)
  return this
}

ApiServer.prototype.listen = function () {
  var arguments = Array.prototype.slice.call(arguments)
  var port = this.port, hostname, callback
  arguments.forEach(function (arg) {
    if (typeof arg === 'function') {
      callback = arg
      return
    }
    if (typeof arg === 'string' && isNaN(Number(arg))) {
      hostname = arg
      return
    }
    if (!isNaN(Number(arg))) {
      port = arg
      return
    }
  })
  this.server.listen(port, hostname, callback)
}

ApiServer.prototype.close = function (callback) {
  callback && this.server.once('close', callback)
  this.server.close()
}

// export middleware
Object.keys(middleware).forEach(function (middlewareName) {
  module.exports[middlewareName] = middleware[middlewareName]
})

// private
function onRequest(request, response) {
  var self = this
  request.requestedAt = new Date().getTime()
  request.parsedUrl = url.parse(request.url, true)
  request.pathname = request.parsedUrl.pathname
  request.querystring = qs.parse(request.parsedUrl.search.replace(/^\?/, ''))
  request.connection.setTimeout(this.timeout, function () {
    self.emit('timeout', request.url)
  })
  request.makeBuffered()
  request.pause()

  var end = response.end
  response.end = function () {
    end.apply(this, arguments)
    self.emit('requestEnd', request.url, new Date().getTime() - request.requestedAt)
  }

  this.JSONTransport(request, response)

  var executionChain = this.router.get(request.pathname)

  if (!executionChain) {
    return response.serveJSON({
      httpStatusCode: 404,
      json: { success: false, reason: request.pathname + ' api not found' }
    })
  }

  new Chain(executionChain, function (err) {
    if (err) {
      response.serveJSON({
        success: false,
        reason: 'something went wrong: ' + err,
        stack: err.stack
      }, {
        httpStatusCode: 500
      })
      self.emit('error', request.url, err)
    }
  }).call(request, response)
}