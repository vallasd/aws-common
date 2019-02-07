exports.action = (event) => { // eslint-disable-line

  const param = {
    secret: {
      secretId: 'common/QA',
      secret: event.body,
      method: 'POST',
    },
  };

  if (event.queryStringParameters.region) {
    param.secret.region = event.queryStringParameters.region;
  }

  return param;
};
