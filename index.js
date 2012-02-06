module.exports = process.env.APISERVER_COV
   ? require('./lib-cov/apiserver')
   : require('./lib/apiserver')