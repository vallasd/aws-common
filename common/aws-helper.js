// aws-helper.js (helper class to create requests and save data)

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

const fetch = require('node-fetch');
const debug = (process.env.debug == 'true');
const _returnType = {
  text: 'text',
  html: 'html',
  xml: 'xml',
  json: 'json'
};

module.exports = {

  // dictionary of returnTypes that returnResponse can process.  (also returned as key in returnResponse's response)
  returnType: _returnType,

  // adds a Content-Type header for the specific returnType
  updateContentTypeHeader: function(headers, returnType) { return _updateContentTypeHeader(headers, returnType); },

  /*
      // These properties are part of the Fetch Standard (requestParams)
      method: 'GET',
      headers: {},              // request headers. format is the identical to that accepted by the Headers constructor (see below)
      body: null,               // request body. can be null, a string, a Buffer, a Blob, or a Node.js Readable stream
      redirect: 'follow',       // set to `manual` to extract redirect headers, `error` to reject redirect
      parameters: dictionary    // a dictionary of parameters and their values

      // The following properties are node-fetch extensions
      follow: 20,               // maximum redirect count. 0 to not follow redirect
      timeout: 7000,            // req/res timeout in ms, it resets on redirect. 0 to disable (OS limit applies)
      compress: true,           // support gzip/deflate content encoding. false to disable
      size: 0,                  // maximum response body size in bytes. 0 to disable
      agent: null               // http(s).Agent instance, allows custom proxy, certificate, lookup, family etc.

      // Used when creating the response
      requestName: string,       // used for logging
      returnType: json,          // The type of body that will be returned, can be text, json, html, xml (this is also returned in response)
  */

  // returns promise for the result of a request, formatted for AWS Lambda response
  returnResponse: function(requestParams) { return _returnResponse(requestParams); },

  // returns an internal Server Error response for a thrown error, formatted for AWS Lambda response
  internalServerErrorResponse: function(err, event, secret) { return _internalServerErrorResponse(err, event, secret); },

  // will attempt to turn bodyData to a string or JSON, if it fails returns body data as a binary
  convertBodyData: function(bodyData) { return _convertBodyData(bodyData); },

  // parses QueryString using string splitting to return a dictionary of parameters
  parseQueryStringToDictionary: function(queryString) { return _parseQueryStringToDictionary(queryString); },

  // creates a URL with parameters given a baseURL and dictionary of parameters
  createURL: function(baseURL, parameters) { return _createURL(baseURL, parameters); },

  // returns endpoint string, throws err if endpoint can not be determined or method is inappropriate
  endpointName: function(event, endpointBase, endpointData) { return _endpointName(event, endpointBase, endpointData); },

  // converts JSON to a dictionary of Parameters (conversionType can be 'bracket' or 'dash', default is 'bracket')
  convertJSONToParameters: function(json, conversionType) { return _convertJSONToParameters(json, conversionType); },

  // scrubs a dictionary of secrets from the string, anywhere a secret is shown in string, 'SECRET' will be displayed
  scrub: function(secret, string) { return _scrub(secret, string); },

  // converts potentialJSON in body to JSON structure.  Throws error if it can not convert.
  convertToJSON: function(potentialJSON) { return _convertToJSON(potentialJSON); }
};

function _headerType(contentType) {
  contentType = contentType.split(';')[0];
  if (contentType == 'application/json') return _returnType.json;
  if (contentType == 'text/json') return _returnType.json;
  if (contentType == 'application/xml') return _returnType.xml;
  if (contentType == 'text/xml') return _returnType.xml;
  if (contentType == 'text/plain') return _returnType.text;
  if (contentType == 'text/html') return _returnType.html;
  return _returnType.json;
}

function _updateContentTypeHeader(headers, returnType) {
  if (returnType == 'text') headers['Content-Type'] = 'text/plain';
  else if (returnType == 'json') headers['Content-Type'] = 'text/json';
  else if (returnType == 'html')  headers['Content-Type'] = 'text/html';
  else if (returnType == 'xml') headers['Content-Type'] = 'text/xml';
  else throw new Error('returnType |' + returnType + '| not recognized');
}

function _returnResponse(requestParams) {

  // create async request
  const request = async () => {

    try {

      // if requestParams wasn't passed, we will create a blank dictionary and cleanly fail
      if (requestParams == null) requestParams = {};

      // create the full url and make a copy of requestName for error and logs
      let url = _createURL(requestParams.url, requestParams.parameters);
      let requestName = requestParams.requestName;

      // create a timeout of seven seconds if no timeout supplied
      let timeout = (requestParams.timeout ? requestParams.timeout : 7000);
      requestParams.timeout = timeout;

      // create headers and Content-Type header based on returnType in requestParams (default will be json)
      let headers = {};

      // display debug
      if (debug) console.log(Date(), 'returnResponse |' + requestName + '| url: |' + url + '|');
      if (debug) console.log(Date(), 'returnResponse |' + requestName + '| params: |' + JSON.stringify(requestParams) + '|');

      // remove parameters not needed for fetch
      delete requestParams.url;
      delete requestParams.requestName;
      delete requestParams.parameters;
      delete requestParams.returnType;

      // fetch the request and save as result
      let result = await fetch(url, requestParams);

      // get the result headers to determine how to parse the result
      if (debug) console.log(Date(), 'returnResponse |' + requestName + '| Content-Type: |' + result.headers.get('Content-Type') + '|');
      let returnType = _headerType(result.headers.get('Content-Type'));
      _updateContentTypeHeader(headers, returnType);

      // create response and determine if it will be an responseIdentifier
      var response = { returnType: returnType };

      // process as json
      if (returnType == _returnType.json) {
        let json = await result.json();
        response.headers = headers;
        response.statusCode = result.status;
        response.body = json;
        if (debug) console.log(Date(), 'returnResponse |' + requestName + '| returning: ' + returnType);
        return response;
      }

      // process as text
      if (returnType == _returnType.text || returnType == _returnType.xml || returnType == _returnType.html) {
        let text = await result.text();
        response.headers = headers;
        response.statusCode = result.status;
        response.body = text;
        if (debug) console.log(Date(), 'returnResponse |' + requestName + '| returning: ' + returnType);
        return response;
      }

      // we did not find returnType, throw err
      let err = '|' + requestName + '| unable to parse returnType |' + returnType + '|';
      throw new Error(err);
    }

    // throw any errors up
    catch(err) { throw err; }
  };

  return request();
}

function _internalServerErrorResponse(err, event, secret) {

  // scrub secrets from err message in case they were passed from a thrown err
  if (secret != null) {
    let scrubbed = _scrub(secret, err.message);
    err.message = scrubbed;
  }

  // set the err code to 500 if it wasn't already set
  err.code = (err.code ? err.code : 500);

  // log error codes of 500
  if (err.code == 500) {
    console.log(Date() + ' error: ' + err);
    console.log(Date(), 'event data: ' + JSON.stringify(event)); // get event data for later testing
  }

  // create body
  let body = {
    'code': err.code,
    'message': err.message
  };

  // set the returnType to text
  let returnType = _returnType.json;

  // create headers for the error response
  let headers = {};
  _updateContentTypeHeader(headers, returnType);

  return {
    returnType: returnType,
    headers: headers,
    statusCode: err.code,
    body: JSON.stringify(body)
  };
}

function _convertBodyData(bodyData) {

  if (bodyData == [] || bodyData == null) return null; // return null for empty bodies
  var string = null;

  try {
    string = Buffer.concat(bodyData).toString();
    let json = JSON.parse(string);
    return json;
  }

  catch(err) {
    if (string != null) return string;
    return bodyData;
  }
}

function _parseQueryStringToDictionary(queryString) {

  // If the query string is null, log a return empty dictionary
  if (queryString == null) {
    return {};
  }

  var dictionary = {};

  // remove the '?' from the beginning of the
  // if it exists
  if (queryString.indexOf('?') === 0) {
    queryString = queryString.substr(1);
  }

  // Step 1: separate out each key/value pair
  var parts = queryString.split('&');

  for(var i = 0; i < parts.length; i++) {
    var p = parts[i];
    // Step 2: Split Key/Value pair
    var keyValuePair = p.split('=');

    // Step 3: Add Key/Value pair to Dictionary object
    var key = keyValuePair[0];
    var value = keyValuePair[1];

    // decode URI encoded string
    value = decodeURIComponent(value);
    value = value.replace(/\+/g, ' ');

    dictionary[key] = value;
  }

  // Step 4: Return Dictionary Object
  return dictionary;
}

function _createURL(baseURL, parameters) {

  // returns null if we dont have a baseURL
  if (baseURL == null) {
    return null;
  }

  // return concatenated string of just orderedParameters that have values
  var string = baseURL + '?';
  for (var key in parameters) {
    var value = parameters[key];
    string = string + key + '=' + value + '&';
  }

  // remove last character if it is a ? or &
  var last = string.slice(-1);
  if ( last == "?" || last == "&" ) {
    string = string.slice(0, -1);
  }

  return string;
}

function _endpointName(event, endpointBase, endpointData) {

  // check for null endpointBase
  if (endpointBase == null) {
    endpointBase = "";
  }

  if (event.path == null) {
    let error =  new Error('path not found eventpath: |' + event.path + '| basePath: |/' + endpointBase + '/|');
    error.code = 404;
    throw error;
  }

  // add apiName to event.path if it doesn't exist (AWS doesn't include, sam client does)
  let apiName = endpointBase.split('/')[0];

  if (event.path.includes(apiName) == false) event.path = '/' + apiName + event.path;

  // attempt to find name requestHandler endpoint and make sure it is the correct method
  for (var index in endpointData) {
    let endpoint = endpointData[index];
    let requestPath = '/' + endpointBase + '/' + endpoint.name;
    if (requestPath == event.path) {
      for (var index in endpoint.methods) if (event.httpMethod == endpoint.methods[index]) return endpoint.name;
      let error =  new Error('|' + event.httpMethod + '| method not available for |' + endpoint.name + '|');
      error.code = 400;
      throw error;
    }
  }

  // attempt to find name requestHandler endpoint for sam client and make sure it is the correct method


  // we didn't find the endpoint, return null
  let error =  new Error('path not found eventpath: |' + event.path + '| basePath: |/' + endpointBase + '/|');
  error.code = 404;
  throw error;
}

function _convertJSONToParameters(json, conversionType) {
  return {}; // need to finish
}

function _scrub(secret, string) {
  for (var key in secret) {
    var value = secret[key];
    if (typeof value == 'string' && value != 'undefined') {
      string = string.replace(value, 'SECRET');
    }
  }
  return string;
}

function _convertToJSON(potentialJSON) {

  if (potentialJSON == null) return {};

  if (typeof potentialJSON == 'string') {
    try {
      json = JSON.parse(potentialJSON);
      return json;
    }
    catch(err) {
      let error = new Error('delivered JSON is not parsable');
      error.code = 400;
      throw error;
    }
  }

  return potentialJSON;
}
