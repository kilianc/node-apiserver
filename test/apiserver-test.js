var http = require('http'),
    should = require('should'),
    Assertion = should.Assertion,
    jsonreq = require('request').defaults({ json: true }),
    ApiServer = require('../'),
    lib = process.env.APISERVER_COV ? 'lib-cov' : 'lib'
    middleware = require('../' + lib + '/middleware'),
    objectModule = require('./fixtures/object-module'),
    classModule = new (require('./fixtures/class-module'))(),
    version = require('../package').version

var apiserver
var defaultPort = 9000
var customPort = 8080

describe('ApiServer', function () {
  describe('should exports', function () {
    it('the right module version', function () {
      ApiServer.version.should.be.equal(version)
    })
    it('all the middleware', function () {
      Object.keys(middleware).forEach(function (middlewareName) {
        ApiServer[middlewareName].should.be.equal(middleware[middlewareName])
      })
    })
  })
  describe('#()', function () {
    it('should use default values as options', function () {
      apiserver = new ApiServer()
      apiserver.timeout.should.be.equal(15000)
      apiserver.standardHeaders.should.be.eql({
        'cache-control': 'max-age=0, no-cache, no-store, must-revalidate',
        'expires': 0,
        'pragma': 'no-cache',
        'x-server': 'ApiServer v' + ApiServer.version + ' raging on nodejs ' + process.version,
        'access-control-allow-origin': '*.default.lan',
        'access-control-allow-headers': 'X-Requested-With'
      })
    })
    it('should allocate a new http server', function () {
      apiserver.should.have.property('server')
      apiserver.server.should.be.an.instanceof(http.Server)
    })
    it('should attach a request handler to the http server', function () {
      apiserver.server.listeners('request').should.have.length(1)
    })
    it('should normalize the timeout option', function () {
      apiserver = new ApiServer({ timeout: 1000 })
      apiserver.timeout.should.be.equal(1000)
      apiserver = new ApiServer({ timeout: -10 })
      apiserver.timeout.should.be.equal(15000)
      apiserver = new ApiServer({ timeout: NaN })
      apiserver.timeout.should.be.equal(15000)
      apiserver = new ApiServer({ timeout: null })
      apiserver.timeout.should.be.equal(15000)
    })
    it('should have JSONParser as default transport', function () {
      apiserver = new ApiServer()
      apiserver.JSONTransport.should.be.an.instanceof(Function)
    })
    it('should pass options to the JSONParser', function () {
      var options = { foo: 'bar' }
      apiserver = new ApiServer(options)
      options.should.have.property('domain')
    })
    it('should store extra transports', function () {
      var fakeTransport = { }
      apiserver = new ApiServer({ transports: [fakeTransport] })
      apiserver.transports.should.include(fakeTransport)
    })
  })
  describe('#listen()', function () {
    before(function () {
      apiserver = new ApiServer({ port: defaultPort })
    })
    afterEach(function () {
      apiserver.close()
    })
    it('should listen to the port ' + defaultPort + ' by default', function (done) {
      apiserver.listen(function () {
        jsonreq.get('http://localhost:' + defaultPort, done)
      })
    })
    it('should listen to the port ' + defaultPort + ' by default without providing a callback', function (done) {
      apiserver.server.once('listening', function () {
        jsonreq.get('http://localhost:' + defaultPort, done)
      })
      apiserver.listen()
    })
    it('should listen to custom ports', function (done) {
      apiserver.listen(8000, function () {
        jsonreq.get('http://localhost:8000', done)
      })
    })
    it('should listen to custom ports as string', function (done) {
      apiserver.listen('8000', function () {
        jsonreq.get('http://localhost:8000', done)
      })
    })
    it('should listen to custom ports without providing a callback', function (done) {
      apiserver.server.once('listening', function () {
        jsonreq.get('http://localhost:8000', done)
      })
      apiserver.listen(8000)
    })
    it('should listen to custom ports as string without providing a callback', function (done) {
      apiserver.server.once('listening', function () {
        jsonreq.get('http://localhost:8000', done)
      })
      apiserver.listen('8000')
    })
    it('should listen to custom hostname', function (done) {
      apiserver.listen('localhost', function () {
        jsonreq.get('http://localhost:' + defaultPort, done)
      })
    })
    it('should listen to custom hostname without providing a callback', function (done) {
      apiserver.server.once('listening', function () {
        jsonreq.get('http://localhost:' + defaultPort, done)
      })
      apiserver.listen('localhost')
    })
    it('should listen to custom hostname and custom port', function (done) {
      apiserver.listen(customPort, 'localhost', function () {
        jsonreq.get('http://localhost:' + customPort, done)
      })
    })
    it('should listen to custom hostname and custom port as string', function (done) {
      apiserver.listen(customPort.toString(), 'localhost', function () {
        jsonreq.get('http://localhost:' + customPort, done)
      })
    })
    it('should listen to custom ports and hostname without providing a callback', function (done) {
      apiserver.server.once('listening', function () {
        jsonreq.get('http://localhost:' + customPort, done)
      })
      apiserver.listen(customPort, 'localhost')
    })
    it('should listen to custom ports as string and hostname without providing a callback', function (done) {
      apiserver.server.once('listening', function () {
        jsonreq.get('http://localhost:' + customPort, done)
      })
      apiserver.listen(customPort.toString(), 'localhost')
    })
  })
  describe('#use()', function () {
    it('should correctly store middleware', function () {
      var middleware = function () {}
      var route = /.+/
      apiserver = new ApiServer()
      apiserver.use(route, middleware)
      apiserver.middlewareList.should.have.length(1)
      apiserver.middlewareList[0].should.eql({
        route: route,
        handle: middleware
      })
    })
    it('should call the routerMapper', function (done) {
      apiserver = new ApiServer({ router: { update: done.bind(null, null) } })
      apiserver.use(/./, { hadle: function () {} })
    })
  })
  describe('#addModule()', function () {
    it('should correctly store modules / object', function () {
      apiserver = new ApiServer()
      apiserver.addModule('v1', 'module_name', objectModule)
      apiserver.activeApiModules.should.have.property('v1')
      ;['successApi','errorApi','get'].forEach(function (method) {
        apiserver.activeApiModules['v1']['module_name'][method].should.be.instanceof(Function)
      })
      ;['timeout'].forEach(function (method) {
        apiserver.activeApiModules['v1']['module_name'][method].get.should.be.instanceof(Function)
      })
    })
    it('should correctly store modules / class', function () {
      apiserver = new ApiServer()
      apiserver.addModule('v1', 'module_name', classModule)
      apiserver.activeApiModules.should.have.property('v1')
      ;['successApi','errorApi','get','timeout'].forEach(function (method) {
        apiserver.activeApiModules['v1']['module_name'][method].should.be.instanceof(Function)
      })
    })
    it('should trigger router.update', function (done) {
      apiserver = new ApiServer({ router: { update: done.bind(null, null) } })
      apiserver.addModule('v1', 'module_name', objectModule)
    })
  })
  describe('Events', function () {
    before(function (done) {
      apiserver = new ApiServer({ timeout: 300 })
      apiserver.addModule('v1', 'test', objectModule)
      apiserver.listen(defaultPort, done)
    })
    after(function () {
      apiserver.close()
    })
    it('should emit requestEnd event', function (done) {
      apiserver.once('requestEnd', function (url, time) {
        should.exist(url)
        should.exist(time)
        url.should.be.equal('/v1/test/am_a_public_api')
        time.should.be.a('number')
        done()
      })
      jsonreq.get('http://localhost:' + defaultPort + '/v1/test/am_a_public_api')
    })
    it('should emit error event on exceptions', function (done) {
      apiserver.once('error', function (url, err) {
        should.exist(err)
        should.exist(url)
        err.should.be.instanceof(Error)
        url.should.be.equal('/v1/test/error_api')
        done()
      })
      jsonreq.get('http://localhost:' + defaultPort + '/v1/test/error_api')
    })
    it('should emit requestEnd event on exceptions', function (done) {
      apiserver.once('requestEnd', function (url, time) {
        should.exist(url)
        should.exist(time)
        url.should.be.equal('/v1/test/am_a_public_api')
        time.should.be.a('number')
        done()
      })
      jsonreq.get('http://localhost:' + defaultPort + '/v1/test/am_a_public_api')
    })
    it('should emit timeout event on timeout', function (done) {
      apiserver.once('timeout', function (url) {
        should.exist(url)
        url.should.be.equal('/v1/test/timeout')
        done()
      })
      jsonreq.get('http://localhost:' + defaultPort + '/v1/test/timeout', function () {})
    })
  })
  describe('Routing', function () {
    before(function (done) {
      apiserver = new ApiServer()
      apiserver.addModule('v1', 'test', objectModule)
      apiserver.listen(defaultPort, done)
    })
    after(function () {
      apiserver.close()
    })
    it('should success calling an API', function (done) {
      jsonreq.get('http://localhost:' + defaultPort + '/v1/test/success_api', function (err, response, body) {
        response.statusCode.should.be.equal(200)
        body.should.be.eql({ success: true })
        done(err)
      })
    })
    it('should fail calling a throwing exception API', function (done) {
      apiserver.once('error', function () {}) //shut up mocha!
      jsonreq.get('http://localhost:' + defaultPort + '/v1/test/error_api', function (err, response, body) {
        response.statusCode.should.be.equal(500)
        body.should.have.property('success')
        body.success.should.be.equal(false)
        done(err)
      })
    })
  })
  describe('Querystring', function () {
    before(function (done) {
      apiserver = new ApiServer()
      apiserver.addModule('v1', 'test', objectModule)
      apiserver.listen(defaultPort, done)
    })
    after(function () {
      apiserver.close()
    })
    it('should give back my querystring / GET', function (done) {
      jsonreq.get({
        uri: 'http://localhost:' + defaultPort + '/v1/test/get',
        qs: { foo: 'bar', bar: 'foo' }
      }, function (err, response, body) {
        body.should.be.eql({ foo: 'bar', bar: 'foo' })
        done(err)
      })
    })
    it('should give back my querystring / POST', function (done) {
      jsonreq.post({
        uri: 'http://localhost:' + defaultPort + '/v1/test/get',
        qs: { foo: 'bar', bar: 'foo' }
      }, function (err, response, body) {
        body.should.be.eql({ foo: 'bar', bar: 'foo' })
        done(err)
      })
    })
  })
  describe('Timeout', function () {
    before(function (done) {
      apiserver = new ApiServer({ timeout: 200 })
      apiserver.addModule('v1', 'test', objectModule)
      apiserver.listen(defaultPort, done)
    })
    after(function () {
      apiserver.close()
    })
    it('should close the response following the timeout option', function (done) {
      jsonreq.get({
        uri: 'http://localhost:' + defaultPort + '/v1/test/timeout',
        qs: { foo: 'bar', bar: 'foo' }
      }, function (err, response, body) {
        should.not.exist(response)
        should.exist(err)
        done()
      })
    })
  })
})