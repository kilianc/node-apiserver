module.exports = function (options) {
  options = (options !== null && options !== undefined && options.constructor === Object) ? options : {}
  options.realm = options.realm || 'Please signin.'
  options.credentials = options.credentials || []

  if (options.encode) {
    options.credentials.forEach(function (credential, i) {
      options.credentials[i] = 'Basic ' + new Buffer(credential, 'utf8').toString('base64')
    })
  }

  return function (request, response, next) {
    if (request.headers.authorization === undefined) {
      onAuthFailed(response, options.realm)
      return next(null, true)
    }
    var allowed = false
    for (var i = 0; i < options.credentials.length && allowed === false; i++) {
      allowed |= options.credentials[i] === request.headers.authorization
    }
    if (!allowed) {
      onAuthFailed(response, options.realm)
    }
    next(null, !allowed)
  }
}

function onAuthFailed(response, realm) {
  response.serveJSON(null, {
    httpStatusCode: 401,
    headers: { 'www-authenticate': 'Basic realm=\'' + realm + '\'' }
  })
}