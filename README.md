# node-apiserver ![project status](http://dl.dropbox.com/u/2208502/maintained.png)

A ready to go modular http API Server.

#transports

- JSON
- JSONP,
- JSONP+iFrame _(you can make cross-domain POST inside the same parent domain: 's1.example.com, s2.example.com, ...')_

## Dependencies

- nodejs v0.4.11+
- http _native module_
- querystring _native module_
- node-bufferjoiner [repository](https://github.com/kilianc/node-bufferjoiner)

## Installation and first run

    $ git clone git://github.com/kilianc/node-apiserver.git
    $ cd node-apiserver
    $ node example.js

## Usage

    var util = require('util'),
        querystring = require('querystring'),
        ApiServer = require('node-apiserver'),
        ApiModule = require('node-apiserver').ApiModule;

    ...

    var UserModule = function(userCollection, myotherObj, myCustomConfig) {
        ...
        this.userCollection = userCollection;
        ApiModule.call(this);
    };

    util.inherits(UserModule, ApiModule);

    // this is a private method, it means that you must send a right Authorization header within your request.
    // your method can be reached to http://yourserver.com/user/my_first_camel_case_method
    UserModule.prototype.myFirstCamelCaseMethodPrivate = function(request, response) {

        var self = this;
        var postData = this.parsePost(request); //inherited from ApiModule.

        if(!/^([a-z0-9_\.\-])+\@(([a-z0-9\-])+\.)+([a-z0-9]{2,4})+$/.test(postData.email)){
            self.emit('responseReady', request, response, 200, null, { success: false, reason: 'email not valid' });
            return this;
        }

        this.userCollection.insert({ email: postData.email }, { safe: true }, function(err, user) {

            if(err){
                self.emit('responseReady', request, response, 200, 'this is the http status message', { success: false, reason: 'email not unique' });
                return this;
            } 

            self.emit('responseReady', request, response, 200, 'this is the http status message', { email: postData.email, success: true });
        });
    };

    // this is a public method
    // the server will check for the [Private|Public] word at the end of the method name.
    // your method can be reached to http://yourserver.com/user/my_second_camel_case_method
    UserModule.prototype.mySecondCamelCaseMethodPublic = function(request, response) {

        var self = this;
        var postData = this.parsePost(request);

        if(!/^([a-z0-9_\.\-])+\@(([a-z0-9\-])+\.)+([a-z0-9]{2,4})+$/.test(postData.email)){
            self.emit('responseReady', request, response, 200, null, { success: false, reason: 'email not valid' });
            return this;
        }

	        this.userCollection.insert({ email: postData.email }, { safe: true }, function(err, user) {

            if(err){
                self.emit('responseReady', request, response, 200, 'this is the http status message', { success: false, reason: 'email not unique' });
                return this;
            } 

            self.emit('responseReady', request, response, 200, 'this is the http status message', { email: postData.email, success: true });
        });
    };

    ...

    var apiServer = new ApiServer('mydomain.com', standardHeaders, "username:password");
    apiServer.addModule('user', new UserModule(new mongodb.Collection(mongodbClient, 'users'), { foo: 'bar' }, { cool: 'sure' }));
    apiServer.listen(80);

    ...

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