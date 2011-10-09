var
	util = require('util'),
	events = require('events'),
	querystring = require('querystring');

var ApiModule = function(mongodbClient, collections) {

	this.mongodbClient = mongodbClient;
	this.collections = collections;

	events.EventEmitter.call(this);
};

util.inherits(ApiModule, events.EventEmitter);

ApiModule.prototype.parseAuthorization = function(request, response, fieldsNames){

	var authorization;

	if(!request.headers.authorization) {
		this.emit('responseReady', request, response, 401, 'Authorization Required', { error: { type: 'ApiException', message: 'missing authorization' } }, { 'www-authenticate': 'Basic realm=\'Please Authenticate\''});
		return false;
	}

	authorization = new Buffer(request.headers.authorization.replace('Basic ', ''), 'base64').toString('utf8');
	authorization = authorization.split(':');

	if(!fieldsNames)
		fieldsNames = ['email', 'password'];

	var returnObj = {};
	returnObj[fieldsNames[0]] = authorization[0];
	returnObj[fieldsNames[1]] = authorization[1];

	return returnObj;
};

ApiModule.prototype.parsePost = function(request){

	var postData;

	try{
		postData = querystring.parse(request.postData.toString('utf8'));
	}
	catch(e){
		postData = {};
	}
	
	return postData;
};

module.exports = ApiModule;