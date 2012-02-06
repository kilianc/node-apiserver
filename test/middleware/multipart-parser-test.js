var should = require('should'),
    jsonreq = require('request'),
    ApiServer = require('../../'),
    testModule = require('../fixtures/multipart-module')

var apiserver
var defaultPort = 9000
var customPort = 8080

describe('middleware/MultipartParser', function () {
  describe('should skip', function () {
    before(function (done) {
      apiserver = new ApiServer()
      apiserver.addModule('v1', 'test', testModule)
      apiserver.use(/./, ApiServer.multipartParser())
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
    it('!multipart/form-data', function (done) {
      jsonreq.post({
        uri: 'http://localhost:' + defaultPort + '/v1/test/skip',
        headers: { 'content-type': 'multipart/x-foo-bar; boundary=AaB03x' },
        body:
          '--AaB03x\r\n'+
          'content-disposition: form-data; name="foo"\r\n'+
          '\r\n'+
          'bar\r\n'+
          '--AaB03x\r\n'+
          'content-disposition: form-data; name="bar"\r\n'+
          '\r\n'+
          'foo\r\n'+
          '--AaB03x\r\n'+
          'content-disposition: form-data; name="pics"; filename="file.txt"\r\n'+
          'Content-Type: text/plain\r\n'+
          '\r\n'+
          'no detail is too small\r\n'+
          '--AaB03x--'
      }, function (err, response, body) {
        should.not.exist(body)
        done(err)
      })
    })
  })
  describe('should handle', function () {
    before(function (done) {
      apiserver = new ApiServer()
      apiserver.addModule('v1', 'test', testModule)
      apiserver.use(/./, ApiServer.multipartParser())
      apiserver.listen(defaultPort, done)
    })
    after(function () {
      apiserver.close()
    })
    it('multipart/form-data', function (done) {
      jsonreq.post({
        uri: 'http://localhost:' + defaultPort + '/v1/test/multipart',
        headers: { 'content-type': 'multipart/form-data; boundary=AaB03x' },
        body:
          '--AaB03x\r\n'+
          'content-disposition: form-data; name="foo"\r\n'+
          '\r\n'+
          'bar\r\n'+
          '--AaB03x\r\n'+
          'content-disposition: form-data; name="bar"\r\n'+
          '\r\n'+
          'foo\r\n'+
          '--AaB03x\r\n'+
          'content-disposition: form-data; name="quote"; filename="quote.txt"\r\n'+
          'Content-Type: text/plain\r\n'+
          '\r\n'+
          'no detail is too small\r\n'+
          '--AaB03x--'
      }, function (err, response, body) {
        body = JSON.parse(body)
        body.should.be.eql({ foo: 'bar', bar: 'foo', quote: 'no detail is too small' })
        done(err)
      })
    })
  })
})