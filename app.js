// app.js (index class for AWS Beanstalk instances)

// The MIT License (MIT)
// Copyright (c) 2018 David C. Vallas (david_vallas@yahoo.com) (dcvallas@twitter)

// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
// associated documentation files (the "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the
// following conditions:

// The above copyright notice and this permission notice shall be included in all copies
// or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
// PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
// FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
// ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

var port = process.env.PORT || 3000,
    http = require('http'),
    url = require('url'),
    lambda = require('./lambda.js'),
    helper = require('./common/helperMethods.js'),
    debug = (process.env.debug == 'true');

var server = http.createServer(function(req, res) {

  let bodyData = [];

  req.on('data', function(data) {
    bodyData.push(data);
  });

  req.on('end', function() {

    // get pertinent values from req and data transfer
    let method = req.method;
    let parse = url.parse(req.url);
    let path = parse.path.split('?')[0];
    let parameters = helper.parseQueryStringToDictionary(parse.query);
    let body = helper.convertBodyData(bodyData);

    // create event for lambda handler
    let event = { path: path, httpMethod: method, queryStringParameters: parameters, body: body };

    // get lambda res and write info to res
    lambda.handler(event, null).then(lambda_res => {
      if (debug) console.log(Date(), 'lambda_res: ' + JSON.stringify(lambda_res));
      res.writeHead(lambda_res.statusCode, lambda_res.headers);
      res.write(lambda_res.body);
      res.end();
    });

  });

});

// Listen on port 3000, IP defaults to 127.0.0.1
server.listen(port);

// Put a friendly message on the terminal
console.log(Date(), 'Server running at http://127.0.0.1:' + port + '/');
