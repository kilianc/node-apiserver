module.exports = {
  amAPrivateApi: function (request, response) {
    response.serveJSON({ success: true })
  }
}