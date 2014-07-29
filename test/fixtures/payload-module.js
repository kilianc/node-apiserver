module.exports = {
  'json': function (request, response) {
    request.resume()
    request.once('end', function () {
      response.serveJSON(request.body)
    })
  },
  'form': function (request, response) {
    request.resume()
    request.once('end', function () {
      response.serveJSON(request.body)
    })
  },
  'skip': function (request, response) {
    request.resume()
    request.once('end', function () {
      response.serveJSON(request.body)
    })
  },
  'parse_error': function (request, response) {
    request.resume()
    request.once('end', function () {
      response.serveJSON(request.parseError)
    })
  },
  'empty': function (request, response) {
    request.resume()
    request.once('end', function () {
      response.serveJSON(request.body)
    })
  }
}