// aws-process.js (helper class to process actions and turn them into lambda responses)
// aws-common
//
// Created by David Vallas. (david_vallas@yahoo.com) (dcvallas@twitter)
// Copyright © 2019 Fenix Labs.
//
// All Rights Reserved.

const fetch = require('node-fetch');
const fs = require('fs');
const documentManager = require('./aws-document.js');
const helper = require('./aws-helper.js');
const secretManager = require('./aws-secret.js');

const debug = (process.env.debug === 'true');

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

      // create headers and Content-Type header based on docType in requestParams
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

      // determine the doctype from headers
      const type = helper.docTypeForHeaders(result.headers);

      // log the doctype
      if (debug) console.log(Date(), `process |request| returning: ${type}`);

      // update headers content-type with docType's Content-Type
      headers = helper.updateContentTypeHeader(headers, type);

      // create return body
      let body = {};
      const { docType } = helper;
      if (type === docType.json) body = await result.json();
      else if (type === docType.text
        || type === docType.xml
        || type === docType.html) body = await result.text();
      else if (type === docType.jpg) {
        const data = await result.buffer();
        body = data.toString('base64');
      } else throw new Error(`process |request| unable to parse docType |${type}|`);

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

function secret(params, admin) {
  // create async request
  const process = async () => {
    try {
      let s = {};
      if (params.method === 'GET') s = await secretManager.get(params.secretId, params.region);
      else if (params.method === 'POST') {
        if (admin) s = await secretManager.store(params.secretId, params.secret, params.region);
        else throw new Error('process |secret| unable to |POST| secret |not admin|');
      }

      // throw error if secret not returned
      if (helper.isEmpty(s)) {
        if (params.method === 'GET') throw new Error('process |secret| unable to |GET| secret');
        if (params.method === 'POST') throw new Error('process |secret| unable to |POST| secret');
        throw new Error(`process |secret| unable to |${params.method}| secret`);
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

function document(params) {
  const process = async () => {
    try {
      const components = helper.splitDoc(params.path);
      const doc = await documentManager.get(components.path, components.name, components.extension);

      // throw error if secret not returned
      if (doc == null) throw new Error(`process |document| unable to |GET| document |${params.path}|`);

      // set headers
      const headers = helper.updateContentTypeHeader({}, components.extension);

      // log additional info
      if (debug) console.log(Date(), `ext: ${components.extension} headers: ${JSON.stringify(headers)}`);

      // return a lambda response
      return {
        headers,
        body: doc,
        statusCode: 200,
      };
    } catch (error) { throw error; }
  };

  return process();
}

module.exports = {

  /*
      requestParams
      method: 'GET'
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
  secret(params, admin) { return secret(params, admin); },

  /*
    documentParams
    path:   null    path of document you are trying to get
  */

  // retrieves a lambda document
  document(params) { return document(params); },
};
