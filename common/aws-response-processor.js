// aws-process.js (helper class to process actions and turn them into lambda responses)
// aws-common
//
// Created by David Vallas. (david_vallas@yahoo.com) (dcvallas@twitter)
// Copyright © 2019 Fenix Labs.
//
// All Rights Reserved.

const fetch = require('node-fetch'); // eslint-disable-line import/no-unresolved
const secretManager = require('./aws-secret.js');
const helper = require('./aws-helper.js');

const debug = (process.env.debug === 'true');

const returnType = {
  text: 'text',
  html: 'html',
  xml: 'xml',
  json: 'json',
};

function returnTypeForContentType(contentType) {
  const c = contentType.split(';')[0];
  if (c === 'application/json') return returnType.json;
  if (c === 'text/json') return returnType.json;
  if (c === 'application/xml') return returnType.xml;
  if (c === 'text/xml') return returnType.xml;
  if (c === 'text/plain') return returnType.text;
  if (c === 'text/html') return returnType.html;
  return returnType.json;
}

function updateContentTypeHeader(headers, rt) {
  const newHeaders = headers;
  if (rt === 'text') newHeaders['Content-Type'] = 'text/plain';
  else if (rt === 'json') newHeaders['Content-Type'] = 'text/json';
  else if (rt === 'html') newHeaders['Content-Type'] = 'text/html';
  else if (rt === 'xml') newHeaders['Content-Type'] = 'text/xml';
  else throw new Error(`returnType |${returnType}| not recognized`);
  return newHeaders;
}

function request(params) {
  // create async request
  const process = async () => {
    try {
      // set initial variables
      let p = params;

      // if requestParams wasn't passed, we will create a blank dictionary and cleanly fail
      if (p == null) p = {};

      // create the full url and make a copy of requestName for error and logs
      const url = helper.createURL(p.url, p.parameters);

      // create a timeout of seven seconds if no timeout supplied
      const timeout = (p.timeout ? p.timeout : 7000);
      p.timeout = timeout;

      // create headers and Content-Type header based on returnType in requestParams
      // (default will be json)
      let headers = {};

      // display debug
      if (debug) console.log(Date(), `process |request| url: |${url}|`);
      if (debug) console.log(Date(), `process |request| params: |${JSON.stringify(p)}|`);

      // remove parameters not needed for fetch
      delete p.url;
      delete p.requestName;
      delete p.parameters;

      // fetch the request and save as result
      const result = await fetch(url, p);

      // log the content-type
      if (debug) console.log(Date(), `process |request| Content-Type: |${result.headers.get('Content-Type')}|`);

      // determine the returnType from content-type (if no content-type, uses json)
      const rt = returnTypeForContentType(result.headers.get('Content-Type'));

      // log the returnType
      if (debug) console.log(Date(), `process |request| returning: ${rt}`);

      // update headers content-type with returnType
      headers = updateContentTypeHeader(headers, rt);

      // create return body
      let body = {};
      if (rt === returnType.json) body = await result.json();
      else if (rt === returnType.text
        || rt === returnType.xml
        || rt === returnType.html) body = await result.text();
      else throw new Error(`process |request| unable to parse returnType |${rt}|`);

      // return a lambda response
      return {
        headers,
        body,
        statusCode: result.status,
      };
    } catch (error) { throw error; }
  };

  return process();
}

function secret(params) {
  // create async request
  const process = async () => {
    try {
      let s = {};
      if (params.method === 'GET') s = await secretManager.get(params.secretId, params.region);
      if (params.method === 'POST') s = await secretManager.store(params.secretId, params.secret, params.region);
      if (helper.isEmpty(s)) {
        if (params.method === 'GET') throw new Error('process |secret| unable to |GET| secret');
        if (params.method === 'POST') throw new Error('process |secret| unable to |POST| secret');
        throw new Error('process |secret| unable to |UNDEFINED| secret');
      }

      // return a lambda response
      return {
        headers: { 'Content-Type': 'text/json' },
        body: s,
        statusCode: 200,
      };
    } catch (error) { throw error; }
  };

  return process();
}

module.exports = {

  /*
      *These properties are part of the Fetch Standard (requestParams)
      method: 'GET',
      headers: {},              request headers. format is the identical to
                                that accepted by the Headers constructor (see below)
      body: null,               request body. can be null, a string, a Buffer, a Blob,
                                or a Node.js Readable stream
      redirect: 'follow',       set to `manual` to extract redirect headers, `error` to
                                reject redirect
      parameters: dictionary    a dictionary of parameters and their values

      *The following properties are node-fetch extensions
      follow: 20,               maximum redirect count. 0 to not follow redirect
      timeout: 7000,            req/res timeout in ms, it resets on redirect. 0 to disable
                                (OS limit applies)
      compress: true,           support gzip/deflate content encoding. false to disable
      size: 0,                  maximum response body size in bytes. 0 to disable
      agent: null               http(s).Agent instance, allows custom proxy, certificate,
                                lookup, family etc.
  */

  // returns promise for the result of a request, formatted for AWS Lambda response
  request(params) { return request(params); },

  /*
    secretParams
    secret:   only required for a POST method
    secretId: required
    region: us-east-1
    method:   GET or POST
  */

  // stores or retrieves secret, formatted for AWS Lambda response
  secret(params) { return secret(params); },

};
