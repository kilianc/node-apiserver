var should = require('should'),
    Assertion = should.Assertion,
    jsonreq = require('request').defaults({ json: true }),
    ApiServer = require('../../'),
    testModule = require('../fixtures/payload-module')

var apiserver
var defaultPort = 9000
var customPort = 8080

describe('middleware/PayloadParser', function () {
  describe('should skip', function () {
    before(function (done) {
      apiserver = new ApiServer()
      apiserver.addModule('v1', 'test', testModule)
      apiserver.use(/./, ApiServer.payloadParser())
      apiserver.listen(defaultPort, done)
    })
    after(function () {
      apiserver.close()
    })
    ;['GET','HEAD','DELETE', 'TRACE',/* 'CONNECT',*/ 'PATCH'].forEach(function (httpMethod) {
      it(httpMethod, function (done) {
        jsonreq({
          method: httpMethod,
          uri: 'http://localhost:' + defaultPort + '/v1/test/skip',
          json: false,
        }, function (err, response, body) {
          should.not.exist(body)
          done(err)
        })
      })
    })
  })
  describe('should attach parseError', function () {
    before(function (done) {
      apiserver = new ApiServer()
      apiserver.addModule('v1', 'test', testModule)
      apiserver.use(/./, ApiServer.payloadParser())
      apiserver.listen(defaultPort, done)
    })
    after(function () {
      apiserver.close()
    })
    it('on application/json', function (done) {
      jsonreq.post({
        uri: 'http://localhost:' + defaultPort + '/v1/test/parse_error',
        headers: { 'content-type': 'application/json' },
        json: false,
        body: '=:'
      }, function (err, response, body) {
        should.exist(body)
        done(err)
      })
    })
  })
  describe('should handle', function () {
    before(function (done) {
      apiserver = new ApiServer()
      apiserver.addModule('v1', 'test', testModule)
      apiserver.use(/./, ApiServer.payloadParser())
      apiserver.listen(defaultPort, done)
    })
    after(function () {
      apiserver.close()
    })
    it('application/x-www-form-urlencoded', function (done) {
      jsonreq.post({
        uri: 'http://localhost:' + defaultPort + '/v1/test/form',
        json: false,
        form: { foo: 'bar', bar: 'foo' }
      }, function (err, response, body) {
        body = JSON.parse(body)
        body.should.be.eql({ foo: 'bar', bar: 'foo' })
        done(err)
      })
    })
    it('application/json', function (done) {
      jsonreq.post({
        uri: 'http://localhost:' + defaultPort + '/v1/test/json',
        json: { foo: 'bar', bar: 'foo' }
      }, function (err, response, body) {
        body.should.be.eql({ foo: 'bar', bar: 'foo' })
        done(err)
      })
    })
  })
})