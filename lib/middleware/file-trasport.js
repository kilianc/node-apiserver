var url = require('url'),
    fs = require('fs'),
    mime = require('mime')

module.exports = function () {
}

module.exports.prototype.attach = function (request, response) {
  response.serveFile = serveFile.bind(this, request, response)
}

// private

function serveFile(request, response, path, params) {
  params = normalizeParams(params)
  fs.stat(path, function (err, stat) {
    if (err || !stats.isFile()) {
      response.writeHead(404)
      response.end()
    } else {
      fillObject(params.headers, this.standardHeaders)
      params.headers['content-legth'] = stat.size
      params.headers['content-type'] = mimetypes.getContentTypeFromPath(path)
      response.writeHead(params.httpStatusCode, params.httpStatusMessage, params.headers)
      fs.createReadStream(path, params).pipe(response)
    }
  })
}

function normalizeParams (params) {
  params = params || {}
  params.headers = params.headers || {}
  params.httpStatusCode = isNaN(params.httpStatusCode) ? 200 : params.httpStatusCode
  params.httpStatusMessage = params.httpStatusMessage || ''
  return params;
}

function fillObject (targetObj, fillObj) {
  Object.keys(fillObj).forEach(function (key) {
    if (!targetObj.hasOwnProperty(key)) {
      targetObj[key] = fillObj[key]
    }
  })
}