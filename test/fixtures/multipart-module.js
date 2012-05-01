var fs = require('fs');

module.exports = {
  'multipart': function (request, response) {
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
  'skip': function (request, response) {
    response.serveJSON(request.form);
  }
}