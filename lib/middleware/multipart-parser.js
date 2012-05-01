var formidable = require('formidable')

module.exports = function () {
  return function (request, response, next) {
    if (!request.method.match(/(PUT|POST|OPTIONS)/)) {
      return next()
    }
    if (request.headers['content-type'].match(/multipart\/form-data/)) {
      request.resume()
      request.form = new formidable.IncomingForm()
      request.form.parse(request)
      return next()
    }
    next()
  }
}