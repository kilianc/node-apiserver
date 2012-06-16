var querystring = require('querystring'),
    BufferJoiner = require('bufferjoiner')

module.exports = function () {
  return function (request, response, next) {
    if (!request.method.match(/(PUT|POST|OPTIONS)/)) {
      return next()
    }
    request.rawBody = new BufferJoiner()
    request.on('data', function (chunk) {
      request.rawBody.add(chunk)
    })
    request.once('end', function () {
      request.rawBody = request.rawBody.join()
      if (request.headers['content-type'].match(/application\/x-www-form-urlencoded/)) {
        request.body = querystring.parse(request.rawBody.toString('utf8'))
      } else if (request.headers['content-type'].match(/application\/json/)) {
        try {
          request.body = JSON.parse(request.rawBody.toString('utf8'))
        } catch(e) {
          request.parseError = e
          request.body = Object.create(null)
        }
      }
    })
    next()
  }
}