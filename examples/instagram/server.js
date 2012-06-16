require('console-trace')({ always: true, right: true, colors: true })

var ApiServer = require('apiserver'),
    ApiModules = require('./lib/api_modules'),
    routes = require('./config/routes'),
    jsonRequest = require('request'),
    colors = require('colors'),
    connect = require('connect'),
    mongodb = require('mongodb')

var mongodbServer = new mongodb.Server('localhost', 27017, { auto_reconnect: true, poolSize: 5 })
var mongodbDb = new mongodb.Db('apiserver-example-instagram', mongodbServer, { native_parser: false })

mongodbDb.open(function (err, mongodbClient) {
  if (err) {
    console.error('\n ☹ Cannot connect to mongodb: %s\n'.red, err.message)
    return
  }
  var collections = {
    photos: new mongodb.Collection(mongodbClient, 'photos')
  }

  // Static server allocation
  connect().use(connect.static(__dirname + '/public')).listen(8000, function () {
    console.info('\n ✈ Static server listening at http://localhst:8000'.green)
  })

  // ApiServer allocation
  var apiServer = new ApiServer({
    timeout: 1000,
    domain: 'localhost'
  })

  // middleware
  apiServer.use(/^\/list$/, ApiServer.httpAuth({
    realm: 'ApiServer Example',
    encode: true,
    credentials: ['admin:apiserver']
  }))
  apiServer.use(ApiServer.payloadParser())
  apiServer.use(ApiServer.multipartParser())

  // modules and routing
  apiServer.addModule('1', 'photos', new ApiModules.Photos({
    collections: collections,
    // in my case /tmp is on a different partition
    // so I moved the tmp folder in order to avoid files moving.
    // cleaning tmp folder is up to you
    uploadTempPath: process.cwd() + '/tmp',
    uploadPath: process.cwd() + '/public/uploads'
  }))
  apiServer.router.addRoutes(routes)

  // events
  apiServer.on('requestStart', function (pathname, time) {
    console.info(' ☉ :: start    :: %s'.grey, pathname)
  }).on('requestEnd', function (pathname, time) {
    console.info(' ☺ :: end      :: %s in %dms'.grey, pathname, time)
  }).on('error', function (pathname, err) {
    console.info(' ☹ :: error    :: %s (%s)'.red, pathname, err.message)
  }).on('timeout', function (pathname) {
    console.info(' ☂ :: timedout :: %s'.yellow, pathname)
  })

  apiServer.listen(8080, function () {
    console.info(' ✈ ApiServer listening at http://localhst:8080\n'.green)
  })
})