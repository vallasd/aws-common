// requestHandler.js (handles naturalword requests)
// aws-common
//
// Created by David Vallas. (david_vallas@yahoo.com) (dcvallas@twitter)
// Copyright © 2019 Fenix Labs.
//
// All Rights Reserved.

const actionDocHTML = require('./actions/document-html.js');
const actionDocJPG = require('./actions/document-jpg.js');
const actionDocJSON = require('./actions/document-json.js');
const actionDocTEXT = require('./actions/document-text.js');
const actionDocXML = require('./actions/document-xml.js');
const actionDynDelete = require('./actions/dynamo-delete.js');
const actionDynGet = require('./actions/dynamo-get.js');
const actionDynPost = require('./actions/dynamo-post.js');
const actionDynPut = require('./actions/dynamo-put.js');
const actionDynQuery = require('./actions/dynamo-query.js');
const actionNext1 = require('./actions/nextAction-1.js');
const actionNext2 = require('./actions/nextAction-2.js');
const actionPush = require('./actions/push-post.js');
const actionReqHTML = require('./actions/request-html.js');
const actionReqJPG = require('./actions/request-jpg.js');
const actionReqJSON = require('./actions/request-json.js');
const actionReqTEXT = require('./actions/request-text.js');
const actionReqXML = require('./actions/request-xml.js');
const actionResHTML = require('./actions/response-html.js');
const actionResJSON = require('./actions/response-json.js');
const actionResTEXT = require('./actions/response-text.js');
const actionResXML = require('./actions/response-xml.js');
const actionSecGet = require('./actions/secret-get.js');
const actionSecMemory = require('./actions/secret-memory.js');
const actionSecPost = require('./actions/secret-post.js');
const actionSmsPost = require('./actions/sms-post.js');

module.exports = {

  admin: true,
  secretInMemory: true,

  endpointData: [
    { name: 'document/html', methods: ['GET'] },
    { name: 'document/jpg', methods: ['GET'] },
    { name: 'document/json', methods: ['GET'] },
    { name: 'document/text', methods: ['GET'] },
    { name: 'document/xml', methods: ['GET'] },
    { name: 'dynamo', methods: ['DELETE', 'GET', 'POST', 'PUT'] },
    { name: 'dynamo/query', methods: ['GET'] },
    { name: 'nextaction/1', methods: ['GET'] },
    { name: 'nextaction/2', methods: ['GET'] },
    { name: 'push', methods: ['POST'] },
    { name: 'request/html', methods: ['GET'] },
    { name: 'request/jpg', methods: ['GET'] },
    { name: 'request/json', methods: ['GET'] },
    { name: 'request/text', methods: ['GET'] },
    { name: 'request/xml', methods: ['GET'] },
    { name: 'response/html', methods: ['GET'] },
    { name: 'response/json', methods: ['GET'] },
    { name: 'response/text', methods: ['GET'] },
    { name: 'response/xml', methods: ['GET'] },
    { name: 'secret', methods: ['GET', 'POST'] },
    { name: 'secret/memory', methods: ['GET'] },
    { name: 'sms', methods: ['POST'] },
  ],

  action(event, secret, endpoint, previousResponse) {
    if (endpoint === 'document/html') return actionDocHTML.action();
    if (endpoint === 'document/jpg') return actionDocJPG.action();
    if (endpoint === 'document/json') return actionDocJSON.action();
    if (endpoint === 'document/text') return actionDocTEXT.action();
    if (endpoint === 'document/xml') return actionDocXML.action();
    if (endpoint === 'dynamo' && event.httpMethod === 'DELETE') return actionDynDelete.action(event);
    if (endpoint === 'dynamo' && event.httpMethod === 'GET') return actionDynGet.action(event);
    if (endpoint === 'dynamo' && event.httpMethod === 'POST') return actionDynPost.action(event);
    if (endpoint === 'dynamo' && event.httpMethod === 'PUT') return actionDynPut.action(event);
    if (endpoint === 'dynamo/query') return actionDynQuery.action(event);
    if (endpoint === 'nextaction/1') return actionNext1.action(previousResponse);
    if (endpoint === 'nextaction/2') return actionNext2.action(previousResponse);
    if (endpoint === 'push') return actionPush.action(event);
    if (endpoint === 'request/html') return actionReqHTML.action();
    if (endpoint === 'request/jpg') return actionReqJPG.action();
    if (endpoint === 'request/json') return actionReqJSON.action();
    if (endpoint === 'request/text') return actionReqTEXT.action();
    if (endpoint === 'request/xml') return actionReqXML.action();
    if (endpoint === 'response/html') return actionResHTML.action();
    if (endpoint === 'response/json') return actionResJSON.action();
    if (endpoint === 'response/text') return actionResTEXT.action();
    if (endpoint === 'response/xml') return actionResXML.action();
    if (endpoint === 'secret' && event.httpMethod === 'GET') return actionSecGet.action(event);
    if (endpoint === 'secret' && event.httpMethod === 'POST') return actionSecPost.action(event);
    if (endpoint === 'secret/memory') return actionSecMemory.action(secret);
    if (endpoint === 'sms') return actionSmsPost.action(event);

    // we should never get here
    throw new Error(`|${endpoint}| endpoint unknown`);
  },
};
