module.exports = {
  'json': function (request, response) {
    response.serveJSON(request.body)
  },
  'form': function (request, response) {
    response.serveJSON(request.body)
  },
  'skip': function (request, response) {
    response.serveJSON();
  },
  'parse_error': function (request, response) {
    response.serveJSON(request.parseError);
  }
}