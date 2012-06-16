# apiserver [![build status](https://secure.travis-ci.org/kilianc/node-apiserver.png?branch=master)](http://travis-ci.org/kilianc/node-apiserver)

A ready to go, modular, multi transport, streaming friendly, JSON(P) API Server.

## Why use ApiServer and not [restify](https://github.com/mcavage/node-restify) or [express](https://github.com/visionmedia/express)?

Strong competitors I guess.

__Express__ targets web applications providing support for templates, views, and all the facilities the you probably need if you're writing a web app. __Restify__ let you "build "strict" API services" but it's too big and it concentrates on server to server API, that will not be consumed by your browser.

__ApiServer__ is rad. It is a slim, fast, minimal API framework, built to provide you a flexible API consumable both in the browser and from other apps. It ships with JSON, JSONP [__(GET/POST)__](https://github.com/kilianc/node-json-transport) transports and a powerful [fast routing engine](https://github.com/kilianc/node-apiserver-router) OOTB. The source code is small, heavily tested and decoupled. Your API source will be well organized in context objects, allowing you to keep it in a meaningful maintainable way.

### Killer features

* Streaming JSON(P) transport GET/POST browser friendly
* Fast routing system with cached routes
* Implicit route parameters [(rails like)](http://guides.rubyonrails.org/routing.html)
* Fully configurable custom routing
* API modules as Objects/Classes
* Payload paused by default
* Transports decoupled from the core
* Router decoupled from the core
* Compatible with [senchalabs/Connect](https://github.com/senchalabs/Connect) middleware

## Installation

    ⚡ npm install apiserver

```js
var ApiServer = require('apiserver')
```

# Quick look

The example below is intended to be a small sneak peek of the ApiServer API, modules and routes should be moved to separate files.

```js

var ApiServer = require('apiserver')

var apiServer = new ApiServer({ port: 8080 })

// middleware
apiServer.use(/^\/admin\//, ApiServer.httpAuth({
  realm: 'ApiServer Example',
  encode: true,
  credentials: ['admin:apiserver']
}))
apiServer.use(ApiServer.payloadParser())

// modules
apiServer.addModule('1', 'fooModule', {
  // only functions exposed
  options: {
    opt1: 'opt1',
    opt2: 'opt2',
    opt3: 'opt3'
  },
  foo: {
    get: function (request, response) {
      response.serveJSON({
        id: request.querystring.id,
        verbose: request.querystring.verbose,
        method: 'GET',
        options: this.options
      })
    },
    post: function (request, response) {
      request.resume()
      request.once('end', function () {
        response.serveJSON({
          id: request.querystring.id,
          verbose: request.querystring.verbose,
          method: 'POST',
          payload: request.body // thanks to payloadParser
        })
      })
    }
  },
  bar: function (request, response) {
    response.serveJSON({ foo: 'bar', pow: this._pow(5), method: '*/' + request.method })
  },
  // never exposed due to the initial underscore
  _pow: function (n) {
    return n * n
  }
})

// custom routing
apiServer.router.addRoutes([
  ['/foo', '1/fooModule#foo'],
  ['/foo/:id/:verbose', '1/fooModule#foo'],
  ['/foo_verbose/:id', '1/fooModule#foo', { 'verbose': true }],
  ['/bar', '1/fooModule#bar', {}, true] // will keep default routing too
])

// events
apiServer.on('requestStart', function (pathname, time) {
  console.info(' ☉ :: start    :: %s', pathname)
}).on('requestEnd', function (pathname, time) {
  console.info(' ☺ :: end      :: %s in %dms', pathname, time)
}).on('error', function (pathname, err) {
  console.info(' ☹ :: error    :: %s (%s)', pathname, err.message)
}).on('timeout', function (pathname) {
  console.info(' ☂ :: timedout :: %s', pathname)
})

apiServer.listen()
```

Server will respond to

    GET, POST http://localhost:8080/foo
    GET, POST http://localhost:8080/foo/5/true
    GET, POST http://localhost:8080/foo_verbose/5
    *         http://localhost:8080/bar
    *         http://localhost:8080/1/foo_module/bar

For full and detailed examples look at the [examples folder](https://github.com/kilianc/node-apiserver/tree/master/examples)

## Table Of Contents
* [Methods](#class-method-constructor)
  * [#()](#class-method-constructor)
  * [#addModule(version, moduleName, apiModule)](#class-method-addmodule)
  * [#use([route], middleware)](#class-method-use)
  * [#listen([port], [callback])](#class-method-listen)
  * [#close([callback])](#class-method-close)
* [Modules](#modules)
  * [Interface](#modules-interface)
  * [Examples](#modules-examples)
* [Middleware](#middleware)
  * [Interface](#middleware-interface)
  * [Transports](#transports)
* [Router](#router)
  * [Interface](#router-interface)
* [Bundled Middleware](#bundled-middleware)
  * [JSONTransport](#jsontransport)
  * [httpAuth](#httpauth)
  * [mutipartParser](#mutipartparser)
  * [payloadParser](#payloadparser)
* [How to contribute](#how-to-contribute)
* [License](#license)


# Class Methods

## Class Method: constructor

All options will be also passed to the the default transport (JSONTransport) [constructor](https://github.com/kilianc/node-json-transport#syntax), then add here your transport configuration.

### Syntax:

```js
new ApiServer([options])
```

### Available Options:

* __port__ - (`Number|String`: defaults to 8080) the server binding port
* __server__ - (`http(s).Server`: defaults http.Server)
* __timeout__ - (`Number`: defaults to 15000) milliseconds to wait before arbitrary closing the response
* __router__ - (`Object`: defaults to the standard [router](#router)) the routes manager conforms to the [router interface](#router-interface)
* __standardHeaders__ - (`Object`: below the default) response headers defaults, can be overwritten by the [transport](#transports)

```js
{
  'cache-control': 'max-age=0, no-cache, no-store, must-revalidate',
  'expires': 0,
  'pragma': 'no-cache',
  'x-server': 'ApiServer v' + ApiServer.version + ' raging on nodejs ' + process.version
}
```

### Example:

```js
var https = require('https'),
    ApiServer = require('apiserver')

apiserver = new ApiServer({
  port: 80,
  server: https.createServer(),
  standardHeaders: {
    'cache-control': 'max-age=0, no-cache, no-store, must-revalidate',
    'x-awesome-field': 'awezing value'
  },
  timeout: 2000,
  indent: ' ',              // transport
  domain: '.myservice.com',  // transport
  defaultRoute: '/:version/:module/:method'  // router
})
```

## Class Method: addModule

Adds a new [module](#modules) to to the current API set. It triggers the `router.update` method.

### Syntax:

```js
ApiServer.prototype.addModule(apiVersion, moduleName, apiModule)
```

### Arguments:

* __apiVersion__ - (`String`) the version of the API you want to add your module to, it will be the part of the url
* __moduleName__ - (`String`) the name of the module, this will be the second part of your derived routes, after a [case conversion](#modules)
* __apiModule__ - (`Object`) the module object conform to the [modules interface](#module-interface)

### Examples:

```js
var apiserver = new ApiServer()
apiserver.addModule('v1', 'user', userModule)
apiserver.addModule('v1', 'pages', pageModule)
apiserver.addModule('v2', 'user', userModule2)
```

## Class Method: use

Adds a middleware object to the [middleware chain](#middleware-chain). It triggers the `router.update` method.

Each middleware is associated to a `RegExp` used to test the API end-point route. If the route matches the `RegExp` the middleware will be a part of the chain and will be executed.

Read more about middleware [here](#middleware).

### Syntax:

```js
ApiServer.prototype.use([route], middleware)
```

### Arguments:

* __route__ - (`RegExp`: defaults to `/./`) regular expression that the route should match
* __middleware__ - (`Object`) the middleware object conforms to the [middleware interface](#middleware-interface)

### Examples:

```js
var apiserver = new ApiServer()
apiserver.use(new MyMiddleWare({ foo: 'bar', bar: true }))
apiserver.use(/(signin|signup)/, ApiServer.payloadParser())
apiserver.use(/^\/v1\/files\/upload$/, ApiServer.multipartParser())
```

## Class Method: listen
Bind the server to a port

### Syntax:

```js
ApiServer.prototype.listen([port], [callback])
```

### Arguments:

* __port__ - (`Number|String`) overwrite the constructor __port__ parameter
* __callback__ - (`Function`) called when the port is actually bound to the server

### Example:
_From this point on, all the examples will take the require statements as assumption_

```js
var apiserver = new ApiServer()
apiserver.listen(80, function (err) {
  if (err) {
    console.error('Something terrible happened: %s', err.message)
  } else {
    console.log('Successful bound to port %s', this.port)
  }
})
```

## Class Method: close
Unbind the server from the current port

### Syntax:

```js
ApiServer.prototype.close([callback])
```

### Arguments:

* __callback__ - (`Function`) called when the port is actually unbound from the server

### Example:

```js
var apiserver = new ApiServer()
apiserver.listen(80, onListen)

function onListen(err) {
  if (err) {
    console.error('Something terrible happened: %s', err.message)
  } else {
    setTimeout(function () {
      apiserver.close(onClose)
    }, 5000)
  }
}

function onClose() {
  console.log('port unbound correctly')
}
```

# Class Events

## Class Event: requestStart

Emitted when an API endpoint got hit.

### Event data

```js
apiserver.on('requestStart', function (url, requestTime) {
  
})
```

  * __url__ (`String`) - the `request.url`
  * __requestTime__ (`Number`) - when the API method was requested

## Class Event: requestEnd

Emitted when an API method closes the response, even with `response.end`.

### Event data

```js
apiserver.on('requestEnd', function (url, responseTime) {
  
})
```

  * __url__ (`String`) - the `request.url`
  * __responseTime__ (`Number`) - how log the API method took for closing the response

## Class Event: timeout

Emitted when an API method exceed the maximum allowed time ([see `timeout` option](#class-method-constructor)), before closing the response.

### Event data

```js
apiserver.on('timeout', function (url) {

})
```

  * __url__ (`String`) - the `request.url`

## Class Event: error

Emitted when a __sync__ error is triggered during the [middleware chain](#middleware-chain) execution, can be both your API, a transport or a simple middleware.

_You still have to deal with async errors_

### Event data

```js
apiserver.on('error', function (url, err) {
  
})
```

  * __url__ (`String`) - the `request.url`
  * __err__ (`Error`) - the error which triggered the event

# Modules

A module is a set of API __end-points__ grouped in the same __context__:

* __context__: a simple object
* __end-point__: function/method accessible by the object and scoped within the object

## Modules Interface

Each module method (API end-point) must implement this interface and expect request and response parameters

```js
function (request, response)
```

The request object is ["extendend"](https://github.com/kilianc/node-apiserver/blob/master/lib/apiserver.js#L99) ootb with the following members _(aliases in round brackets)_:

* __requestedAt (at)__: timestamp of the request
* __parsedUrl__: a parsed version of the request url with `url.parse`
* __pathname (path)__: the pathname that corresponds to the end-point route
* __querystring (qs)__: the querystring object parsed with [visionmedia/node-querystring](https://github.com/visionmedia/node-querystring)

As you can see, there is no callback to call, you have to deal directly with the response.

Take a look at your [transport documentation](#transports) and use the right method that ships within the response object. You can also roughly close and write to the response __stream__ in an edge case.

## Modules Examples

### Object literal

```js
var apiserver = new ApiServer()
```

```js
var userModule = {
  signin: function (request, response) {
    // rough approach
    response.writeHead(200)
    response.end('ok')
  },
  signout: function (request, response) {
    // JSON transport
    response.serveJSON({ foo: 'bar' })
  }
}
```

```js
apiserver.addModule('v1', 'user', userModule)
```

### Class

```js
var apiserver = new ApiServer()
```

```js
function UserModule(options) {
  this.database = options.database
  this.serviceName = options.serviceName
}

UserModule.prototype.signin = function (request, response) {
  var self = this
  self.database.searchUser(request.querystring.username, function (err) {
    if (err) {
      response.serveJSON({ success: false, err: err.message })
    } else {
      response.serveJSON({ success: true, message: 'welcome to ' + self.serviceName })
    }
  })
}

UserModule.prototype.signout = function (request, response) {
  // you can use the response as usual
  // a redirect for example
  response.writeHead(302, {
    'location': 'http://example.org/logout_suceesful'
  })
  response.end()
}
```

```js
var database = /* your db object*/
apiserver.addModule('v1', 'user', new UserModule(database, 'My Awesome Service'))
```

# Middleware

The concept of middleware is not new at all, you can find the same pattern in [senchalabs/Connect](https://github.com/senchalabs/Connect) in  [mcavage/node-restify](https://github.com/mcavage/node-restify) and in many others. A [middleware](http://en.wikipedia.org/wiki/Middleware) is a piece of software that adds (or patches) a feature into another software. Usually there is a common interface to implement, because the caller software, in this case our __ApiServer__, should know how to interact with the middleware.

_You should check out the [source code](https://github.com/kilianc/node-apiserver/tree/master/lib/middleware) for a large understanding, middleware is relatively easy to code._

## Middleware Chain

The __ApiServer__ uses [kilianc/node-fnchain](https://github.com/kilianc/node-fnchain) to [execute all the active middleware](https://github.com/kilianc/node-apiserver/blob/master/lib/apiserver.js#L132) and reach the API method (that actually is the last ring of the chain). This means that the order of the execution depends on the order you activated the middleware.

Each middleware can both exit with an error or explicitly stop the chain (not reaching your API method). This is useful in case of a precondition check (auth, sessions, DoS attack filter...), or just because you packed some shared code as middleware which must be executed before your API method.

At the middleware execution level, the response object is already patched with the default transport methods, so you can use these methods to write and close the response. Is a good practice to leave at the top of the chain the extra transports middleware.

```js
// constructor adds the default transport automatically
var apiserver = new ApiServer()

// let's ad first our custom transports
apiserver.use(/\.xml$/, myXMLTransport())
apiserver.use(/\.csv$/, myCSVTransport())
apiserver.use(/\.yml$/, myYAMLTransport())

// now activate our middleware
apiserver.use(/form/, ApiServer.payloadParser())
apiserver.use(/upload/, ApiServer.multipartParser())

...
```

__The request payload (the `data` event) is paused by default and can be resumed calling `request.resume()` at any level of execution: middleware, module, transport.__ Why? Because you should explicitly accept or refuse a payload, this way you will save memory not buffering useless data.

Take a look at both the [pause](http://nodejs.org/api/all.html#all_request_pause) and [resume](http://nodejs.org/api/all.html#all_request_resume) official docs.

_ApiServer is using [this patch](https://github.com/kilianc/node-buffered-request) to provide a robust buffered pause resume method, so you don't have do deal with the flying chunks after the pause call_

## Middleware Interface

Each middleware must implement this interface.

```js
module.exports = function (options) {
  return function (request, response, next) {
    // do sometihng async and when you're done call the callback
    options.count++
    next()
  }
}
```

A middleware basically, is a function that returns another function, this one must declare 3 paramaters:

* __request__: the server request already extended by the server
* __response__: the server response already extended by the transports
* __next__: a callback in the following form `function (err, stop)`

The `next` callback expects 2 parameters:

* __err__ - (`Error`) an error object that will throw a server error event and will close the response
* __stop__ - (`Boolean`) a flag that stops the internal chain, that means that your API method will never be called and your middleware should be able to correctly close the response. At this point you already have all the transports available, and you can freely use them.

## Transports

A transport is a particular middleware that "extends" the response object. It can provide new methods that allow you to serve your data to the client in different ways. 

Usually this is how you send data back to the client:

```js
function (request, response) {
  response.writeHead(200, {
    'content-type': 'application/json'
  })
  response.end(JSON.stringify({ foo: 'bar' }))
})
```

This is for example how the default [JSONTransport](https://github.com/kilianc/node-json-transport) simplify the process

```js
function (request, response) {
  response.serveJSON({ foo: 'bar' })
})
```

Basically what a transport does, is to wrap your data around a meaningful format (JSON, JSONP, HTML, XML, CSV, ...) understandable by your clients. It takes care of all the small things that the raw response needs (headers, status codes, buffering, ...)

Transports must be at the top of the middleware chain, in order to allow other middleware to use them.

[JSONTransport](https://github.com/kilianc/node-json-transport) is the default one, is attached before the middleware chain execution and then is available at every level of execution. You don't need to allocate it directly, the server itself will allocate the transport passing as options the __ApiServer__ [constructor](#class-method-constructor) options object.

### Example

```js
module.exports = function (options) {
  function serve<FORMAT>(request, response, data, options) {
    response.writeHead(200, {
      'content-type': 'application/<FORMAT>'
    })
    response.end(<FORMAT>.stringify(data))
  }
  return function (request, response) {
    // attach some new method to the response
    response.serve<FORMAT> = serve<FORMAT>.bind(this, request, response)
  }
}
```

where `<FORMAT>` is the formatting method of your data.

# Router

Apiserver uses [apiserver-router](https://github.com/kilianc/node-apiserver-router) as default router, a fast routing system with integrated caching. It basically translates your API methods names in routes, doing some convenient case conversion. Also, it supports [(rails like)](http://guides.rubyonrails.org/routing.html) custom routes and implicit route parameters.

You can change the default behavior passing a custom router as `router` option in the ApiServer [constructor](#class-method-constructor).

## Example

```js
function UserModule(options) {
  this.options = options
}

// will be translated into /1/random_photo_module/create_album
UserModule.prototype.createAlbum = function (request, response) { ... }

// will be translated into /1/random_photo_module/upload_photo
// in this case we will overwrite the default path with a custom one
UserModule.prototype.uploadPhoto = {
  post: function (request, response) { ... }
}

// private method, skipped by the router
UserModule.prototype._checkFileExtension = function (request, response) { ... }

```

```js
apiserver.addModule('1', 'randomPhotoModule', new UserModule())
apiserver.router.addRoute('/photo/:caption', '1/randomPhotoModule#uploadPhoto')
```

N.B. the `moduleName` also will be translated

## Router Interface

Your custom router must implement the following interface.

```js
function Router () {
  ...
}

Router.prototype.update = function (modules, middlewareList) {
  ...
}

Router.prototype.get = function (request) {
  ...
}
```

The `get` method must return the the [middleware chain](#middleware-chain) associated with the `request` parameter, and eventually extend the `request` with new data (ex. implicit route parameters).

# Bundled Middleware

## JSONTransport

[JSONTransport](https://github.com/kilianc/node-json-transport) is the default transport bundled with ApiServer and we can call it the real __killer feature__.

It provides JSON and JSONP that work with both GET / POST methods.

### Examples

```js
// decontextualized API method
function (request, response) {
  response.serveJSON({ foo: 'bar' })
})
```

```js
// decontextualized API method
function (request, response) {
  response.serveJSON(['foo','bar', ...], {
    httpStatusCode: 404,
    httpStatusMessage: 'maybe.. you\'re lost',
    headers: {
      'x-value': 'foo'
    }
  })
})
```
```js
// decontextualized API method
function (request, response) {
  var count = 3
  var interval = setInterval(function () {
    if (count === 0) {
      clearInterval(interval)
      response.streamJSON()
    } else {
      count--
      response.streamJSON({ foo: 'bar' })
    }
  }, 200)
})
```

yields

```js
[
   { "foo": "bar" },
   { "foo": "bar" },
   { "foo": "bar" }
]
```

Read the full docs [here](https://github.com/kilianc/node-json-transport)

## payloadParser

The payload parser automatically __buffers__ the payload and parse it. It only works with __PUT POST OPTIONS__ http methods, because they are the only that can carryout a payload by specs definition.

Two kinds of payload can be parsed:

* `application/x-www-form-urlencoded`
* `application/json`

The following attributes will be attached to the request object:

* __body__: an object containing the parsed data
* __rawBody__: the raw payload as binary [buffer](http://nodejs.org/api/all.html#all_buffer)
* __parseError__: can be `null` or `Error` in case of parse error

### Syntax

```js
ApiServer.payloadParser()
```

### Example

```js
var apiserver = new ApiServer()
apiserver.use(/1\/my_module\/my_method_api$/, ApiServer.payloadParser())
apiserver.addModule('1', 'myModule', {
  'my_method_api': function (request, response) {
    request.resume()
    request.once('end', function () {
      if (request.parseError) {
        // :(
        console.error(request.parseError.message)
      } else {
        request.body // an object containing the parsed data
        request.rawBody // contains a binary buffer with your payload
      }
    })
  }
})
```

## multipartParser

The multipart-parser the attach the payload to a [felixge/node-formidable](https://github.com/felixge/node-formidable) `IncomingForm` object. It only works with __PUT POST OPTIONS__ http methods, because they are the only that can carryout a payload by specs definition.

Only a `multipart/form-data` payload is parsed and the following attribute will be attached to the request object:

* __form__ an IncomingForm object, [read how to deal with it](https://github.com/felixge/node-formidable#formidablefile)

The following attributes will be attached to the request object, *after the IncomingForm end event*:

* __body__: an object containing the parsed data
* __files__: array of uploaded files [instaceof formidable.File](https://github.com/felixge/node-formidable#formidablefile)
* __parseError__: can be `null` or `Error` in case of parse error

### Syntax

```js
ApiServer.multipartParser()
```

### Example

```js
var apiserver = new ApiServer()
apiserver.use(/1\/my_module\/my_method_api$/, ApiServer.multipartParser())
apiserver.addModule('1', 'myModule', {
  'my_method_api': function (request, response) {
    var fields = Object.create(null)
    request.resume()
    request.form.on('field', function (name, value) {
      fields[name] = value
    })
    request.form.on('file', function (name, file) {
      fields[name] = fs.readFileSync(file.path, 'utf8')
    })
    request.form.once('end', function () {
      // do something with your data
    })
  },
  'my_smarter_api': function (request, response) {
    request.resume()
    request.form.once('end', function () {
      // do something with your data
      request.body // fields
      request.files // files
      request.parseError // error
    })
  }
})
```

## httpAuth

The httpauth middleware acts as an auth precondition, checking the `authorization` headers sent with the request.

If the request doesn't pass the authorization check, httpAuth [will close the response](https://github.com/kilianc/node-apiserver/blob/refactor/lib/middleware/httpauth.js#L34) using the standard JSONTransport:

```js
response.serveJSON(null, {
  httpStatusCode: 401,
  headers: { 'www-authenticate': 'Basic realm=\'' + realm + '\'' }
})
```

This will trigger a user/password prompt in your browser

### Syntax

```js
ApiServer.httpAuth([options])
```

### Options
* __realm__: (`String`) the name of your service, this is used by the browser when it prompts for username and password
* __credentials__ - (`Array`) a list of strings (credentials), if your client is a browser you must use the form _username:password_
* __encode__: (`Boolean`: defaults to false) set to true if your client is a browser (will base64 encode)

### Example

```js
var apiserver = new ApiServer()
apiserver.use(/1\/admin\/.+/, ApiServer.httpAuth({
  realm: 'signin please',
  credentials: ['foo:password','bar:password', ...],
  encode: true // we suppose that at the other end of the wire we have a browser
}))
apiserver.addModule('1', 'admin', {
  'protectedApi': function (request, response) {
    // this will executed only if you provide valid credentials
  }
})
```

# How to contribute

__ApiServer__ follows the awesome [Vincent Driessen](http://nvie.com/about/) [branching model](http://nvie.com/posts/a-successful-git-branching-model/).

* You must add a new feature on his own topic branch
* You must contribute to hot-fixing directly into the master branch (and pull-request to it)

ApiServer follows (more or less) the [Felix's Node.js Style Guide](http://nodeguide.com/style.html), your contribution must be consistent with this style.

The test suite is written on top of [visionmedia/mocha](http://visionmedia.github.com/mocha/) and it took hours of hard work. Please use the tests to check if your contribution is breaking some part of the library and add new tests for each new feature.

    ⚡ npm test

and for your test coverage

    ⚡ make test-cov

## License

_This software is released under the MIT license cited below_.

    Copyright (c) 2010 Kilian Ciuffolo, me@nailik.org. All Rights Reserved.

    Permission is hereby granted, free of charge, to any person
    obtaining a copy of this software and associated documentation
    files (the 'Software'), to deal in the Software without
    restriction, including without limitation the rights to use,
    copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the
    Software is furnished to do so, subject to the following
    conditions:
    
    The above copyright notice and this permission notice shall be
    included in all copies or substantial portions of the Software.
    
    THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
    OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
    NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
    HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
    WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
    FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
    OTHER DEALINGS IN THE SOFTWARE.
