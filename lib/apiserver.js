var
	http = require('http'),
	url = require('url'),
	util = require('util'),
	events = require('events'),
	querystring = require('querystring'),
	BufferJoiner = require('bufferjoiner'),
	ApiModule = require('./apimodule');

var ApiServer = function(domain, standardHeaders, credentials, timeout) {

	events.EventEmitter.call(this);

	this.timeout = !timeout || timeout < 0 ? 15000 : timeout;
	this.credentials = 'Basic ' + new Buffer(credentials, 'utf8').toString('base64');

	this.iframeHtmlTemplate = "<!DOCTYPE html PUBLIC '-//W3C//DTD XHTML 1.0 Strict//EN' 'http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd'><html xmlns='http://www.w3.org/1999/xhtml' xml:lang='en' lang='en'><head><meta http-equiv='Content-Type' content='text/html; charset=utf-8'/><title></title><script type='text/javascript' charset='utf-8'>document.domain = '" + domain + "';parent.[CALLBACK]([DATA]);</script></head><body></body></html>";
	this.activeApiModules = {};
	this.standardHeaders = standardHeaders || {
		'cache-control': 'max-age=0, no-cache, no-store, must-revalidate',
		'expires': 0,
		'pragma': 'no-cache'
	};

	this.activeApiModules = {};
	this.server = http.createServer(this.onRequest.bind(this));
};

ApiServer.VERSION = 'v0.1.2';
ApiServer.ApiModule = ApiModule;

util.inherits(ApiServer, events.EventEmitter);

ApiServer.prototype.addModule = function(moduleName, apiModule){

	apiModule.on('responseReady', this.serveResponse.bind(this, apiModule));
	apiModule.on('responseStreamStart', this.streamResponseStart.bind(this, apiModule));
	apiModule.on('responseStreamData', this.streamResponseData.bind(this, apiModule));
	apiModule.on('responseStreamEnd', this.streamResponseEnd.bind(this, apiModule));

	this.activeApiModules[moduleName] = apiModule;
};

ApiServer.prototype.listen = function(port){
	this.server.listen(port);
};

ApiServer.prototype.onRequest = function(request, response) {

	var self = this;
	var parsedUrl = url.parse(request.url, true);

	request.requestedAt = new Date().getTime();
	request.pathname = parsedUrl.pathname.split('/');
	request.querystring = parsedUrl.query;
	request.postData = new BufferJoiner();

	request.apiModule = request.pathname[1] || '';
	request.apiAction = request.pathname[2] || '';

	request.apiModule = request.apiModule.replace(/(\_[a-z])/g, function(match){ return match.toUpperCase()[1]; });
	request.apiAction = request.apiAction.replace(/(\_[a-z])/g, function(match){ return match.toUpperCase()[1]; });

	if(!this.checkApiExists(request)) {
		this.onApiNotFound(request, response);
		return;
	}

	if(!this.authorizedApi(request, response))
		return;

	request.connection.setTimeout(this.timeout);

	if(request.method == 'GET'){
		request.postData = request.postData.join();
		this.onRequestComplete(request, response);
	}
	else {
		request.on('data', function(chunk){
			request.postData.add(chunk);
		});

		request.once('end', function(){
			request.postData = request.postData.join();
			self.onRequestComplete(request, response);
		});
	}
};

ApiServer.prototype.checkApiExists = function(request) {

	return (this.activeApiModules[request.apiModule] && (this.activeApiModules[request.apiModule][request.apiAction + 'Public'] || this.activeApiModules[request.apiModule][request.apiAction + 'Private']));
};

ApiServer.prototype.onApiNotFound = function(request, response) {

	this.serveResponse(this, request, response, 500, 'errore', {
		error: {
			type: 'ApiException',
			message: request.url + ' api not found'
		}
	});
}

ApiServer.prototype.authorizedApi = function(request, response) {

	if(!this.activeApiModules[request.apiModule][request.apiAction + 'Private']) {

		request.apiAction += 'Public';
		return true;
	}

	if(!request.headers.authorization || request.headers.authorization != this.credentials) {

		response.writeHead(401, 'Authorization Required', { 'www-authenticate': 'Basic realm=\'Please Authenticate\''});
		response.end();

		return false;
	}

	request.apiAction += 'Private'

	return true;
};

ApiServer.prototype.onRequestComplete = function(request, response) {

	try {
		this.activeApiModules[request.apiModule][request.apiAction](request, response);
	} catch (err) {

		throw err;

		this.serveResponse(this, request, response, 500, 'errore', {
			error: {
				type: 'ApiException',
				message: 'something went wrong: ' + request.url
			}
		});
	}
};

ApiServer.prototype.serveResponse = function(sender, request, response, httpStatusCode, httpStatusMessage, responseContent, responseHeaders) {

	if(request.querystring.callback) {

		if(request.method == 'POST') {

			contentType = 'text/html';
			responseContent = this.iframeHtmlTemplate.replace('[CALLBACK]', request.querystring.callback).replace('[DATA]', JSON.stringify(responseContent));
		}
		else {
			contentType = 'text/javascript';
			responseContent = request.querystring.callback + '(' + JSON.stringify(responseContent, null, '  ') + ');';
		}
	}
	else {
		contentType = 'text/javascript';
		responseContent = JSON.stringify(responseContent, null, '   ');
	}

	responseHeaders = responseHeaders || {};

	for(var headerKey in this.standardHeaders)
		(responseHeaders[headerKey] === undefined) && (responseHeaders[headerKey] = this.standardHeaders[headerKey]);

	responseHeaders['content-type'] = contentType + '; charset=UTF-8';
	responseHeaders['content-length'] = responseContent.length;

	response.writeHead(httpStatusCode, httpStatusMessage ? httpStatusMessage : '', responseHeaders);
	response.end(responseContent, 'utf8');

	this.emit('requestEnd', request.url, new Date().getTime() - request.requestedAt);
};

ApiServer.prototype.streamResponseStart = function(sender, request, response, httpStatusCode, httpStatusMessage, responseHeaders) {

	if(request.querystring.callback){

		if(request.method == 'POST'){

			contentType = 'text/html';

			var parts = this.iframeHtmlTemplate.replace('[CALLBACK]', request.querystring.callback).split('[DATA]');

			response.streamStart = parts[0] + '[';
			response.streamEnd = ']' + parts[1];

		} else {

			contentType = 'text/javascript';
			response.streamStart = request.querystring.callback + '([';
			response.streamEnd = ']);';
		}

	} else {

		contentType = 'text/javascript';
		response.streamStart = '[';
		response.streamEnd = ']';
	}

	responseHeaders = responseHeaders || {};

	for(var headerKey in this.standardHeaders)
		(responseHeaders[headerKey] === undefined) && (responseHeaders[headerKey] = this.standardHeaders[headerKey]);

	responseHeaders['content-type'] = contentType + '; charset=UTF-8';

	response.writeHead(httpStatusCode, httpStatusMessage ? httpStatusMessage : '', responseHeaders);
	response.write(response.streamStart, 'utf8');

	delete response.streamStart;
};

ApiServer.prototype.streamResponseData = function(sender, request, response, responseChunk, isLast) {
	response.write(JSON.stringify(responseChunk, null, '  ') + (isLast ? '' : ',\n'), 'utf8');
};

ApiServer.prototype.streamResponseEnd = function(sender, request, response){
	response.end(response.streamEnd, 'utf8');
	this.emit('requestEnd', request.url, new Date().getTime() - request.requestedAt);
};

module.exports = ApiServer;