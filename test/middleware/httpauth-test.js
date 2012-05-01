var should = require('should'),
    jsonreq = require('request').defaults({ json: true }),
    ApiServer = require('../../'),
    testModule = require('../fixtures/httpauth-module')

var apiserver
var defaultPort = 8080
var credentials = ['foo:bar']

describe('middleware/HTTPAuth', function () {
  before(function (done) {
    apiserver = new ApiServer()
    apiserver.addModule('v1', 'auth', testModule)
    apiserver.use(/private/, ApiServer.httpAuth({ credentials: credentials, encode: true }))
    apiserver.listen(done)
  })
  after(function () {
    apiserver.close()
  })
  it('should use a custom realm if provided', function () {
    var realm = 'Stay Away.'
    var options = { realm: realm }
    var httpAuth = ApiServer.httpAuth(options)
    options.should.have.property('realm')
    options.realm.should.be.eql(realm)
  })
  it('should encode credentials if required', function () {
    credentials.should.be.eql(['Basic Zm9vOmJhcg=='])
  })
  it('should ask for auth', function (done) {
    jsonreq.get('http://localhost:' + defaultPort + '/v1/auth/am_a_private_api', function (err, response, body) {
      response.statusCode.should.be.equal(401)
      response.headers.should.have.property('www-authenticate')
      done(err)
    })
  })
  it('should accept credentials', function (done) {
    jsonreq.get({
      headers: { 'authorization': 'Basic ' + new Buffer('foo:bar', 'utf8').toString('base64') },
      uri: 'http://localhost:' + defaultPort + '/v1/auth/am_a_private_api'
    }, function (err, response, body) {
      response.statusCode.should.be.equal(200)
      body.should.be.eql({ success: true })
      done(err)
    })
  })
  it('should refuse credentials', function (done) {
    jsonreq.get({
      headers: { 'authorization': 'Basic ' + new Buffer('foo:wrong', 'utf8').toString('base64') },
      uri: 'http://localhost:' + defaultPort + '/v1/auth/am_a_private_api'
    }, function (err, response, body) {
      response.statusCode.should.be.equal(401)
      response.headers.should.have.property('www-authenticate')
      done(err)
    })
  })
})