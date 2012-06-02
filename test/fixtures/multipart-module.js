var fs = require('fs');

module.exports = {
  'multipart': function (request, response) {
    request.resume()
    var fields = Object.create(null)
    request.form.on('field', function (name, value) {
      fields[name] = value
    })
    request.form.on('file', function (name, file) {
      fields[name] = fs.readFileSync(file.path, 'utf8')
    })
    request.form.once('end', function () {
      response.serveJSON(fields)
    })
  },
  'multipartEnd': function (request, response) {
    request.resume()
    request.form.once('end', function () {
      response.serveJSON({ fields: request.body, files: Object.keys(request.files), err: request.parseError })
    })
  },
  'skip': function (request, response) {
    request.resume()
    request.once('end', function () {
      response.serveJSON(request.form)
    })
  }
}