module.exports = {
  successApi: function (request, response) {
    response.serveJSON({ success: true })
  },
  errorApi: function (request, response) {
    throw new Error('Aww')
  },
  'get': function (request, response) {
    response.serveJSON(request.querystring)
  },
  'timeout': function (request, response) {
    // trigger timout
  }
}