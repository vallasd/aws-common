// requestHandler.js (handles naturalword requests)
// aws-common
//
// Created by David Vallas. (david_vallas@yahoo.com) (dcvallas@twitter)
// Copyright © 2019 Fenix Labs.
//
// All Rights Reserved.

const actionText = require('./actions/text.js');
const actionJSON = require('./actions/json.js');
const actionHTML = require('./actions/html.js');
const actionXML = require('./actions/xml.js');
const actionNext1 = require('./actions/next1.js');
const actionNext2 = require('./actions/next2.js');
const actionSecretGet = require('./actions/secretGet.js');
const actionSecretPost = require('./actions/secretPost.js');
const actionSecretMemory = require('./actions/secretMemory.js');

const p = process.env;

module.exports = {

  hasSecret: true,

  secretId() {
    return `${p.apiName}/${p.environment}`;
  },

  basePath() {
    return `${p.apiName}/${p.version}`;
  },

  endpointData: [
    { name: 'text', methods: ['GET'] },
    { name: 'json', methods: ['GET'] },
    { name: 'html', methods: ['GET'] },
    { name: 'xml', methods: ['GET'] },
    { name: 'next1', methods: ['GET'] },
    { name: 'next2', methods: ['GET'] },
    { name: 'secret', methods: ['GET', 'POST'] },
    { name: 'secretFromMemory', methods: ['GET'] },
  ],

  action(event, secret, endpoint, previousResponse) {
    if (endpoint === 'text') return actionText.action();
    if (endpoint === 'json') return actionJSON.action();
    if (endpoint === 'html') return actionHTML.action();
    if (endpoint === 'xml') return actionXML.action();
    if (endpoint === 'next1') return actionNext1.action(previousResponse);
    if (endpoint === 'next2') return actionNext2.action(previousResponse);
    if (endpoint === 'secret' && event.httpMethod === 'GET') return actionSecretGet.action(event);
    if (endpoint === 'secret' && event.httpMethod === 'POST') return actionSecretPost.action(event);
    if (endpoint === 'secretFromMemory') return actionSecretMemory.action(secret);

    // we should never get here
    const err = `|${endpoint}| endpoint unknown`;
    throw new Error(err);
  },
};
