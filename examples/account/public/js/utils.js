function loadTemplate(url, callback) {
  new Request({
    url: url,
    onComplete: function (html) {
      var template = Handlebars.compile(html)
      var tabular = html.match(/<tr[\s\S]*?<\/tr>/g)
      callback(null, function (data) {
        return new Element(tabular ? 'tbody' : 'div', { html: template(data || {}) }).getFirst()
      })
    }
  }).get()
}

function get(url, data, callback) {
  var args = Array.prototype.slice.call(arguments)
  callback = args.pop()
  new Request.JSONP({
    url: url,
    data: data,
    onComplete: function (response) {
      callback(null, response)
    },
    onTimeout: function () {
      callback(new Error('Request timed out: ' + url))
    }
  }).send()
}

var __requestsMap__ = {}
function post(url, fields, callback) {
  var requestId = new Date().getTime()
  var args = Array.prototype.slice.call(arguments)
  callback = args.pop()

  if ($(fields)) {
    var enctype = fields.get('enctype')
    if (enctype != 'multipart/form-data') {
      enctype = 'x-www-form-urlencoded'
    }
    var inputs = fields.getElements('input').map(function (input) {
      input.clone(true, true).inject(input.erase('id'), 'before')
      return input.dispose()
    })
  } else {
    var inputs = []
    Object.keys(fields).forEach(function (fieldName) {
      inputs.push(new Element('input', {
        name: fieldName,
        value: data[fieldName]
      }))
    })
  }

  if (url.match(/\?/)) {
    url += '&callback=__requestsMap__["' + requestId + '"]'
  } else {
    url += '?callback=__requestsMap__["' + requestId + '"]'
  }

  var form = new Element('form', {
    'enctype': enctype,
    'method': 'post',
    'action': url,
    'target': requestId,
    'style': 'display: none'
  }).adopt(inputs).inject(document.body)

  var iframe = new Element('iframe', {
    id: requestId,
    name: requestId,
    styles: { display: 'none' }
  }).inject(document.body)

  __requestsMap__[requestId] = function (response) {
    callback(null, response)
    // cleanup
    delete __requestsMap__[requestId]
    iframe.dispose().destroy()
    form.dispose().destroy()
  }

  form.submit()
}