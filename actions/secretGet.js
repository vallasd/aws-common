exports.action = (event) => {
  const param = {
    secret: {
      secretId: 'common/QA',
      method: 'GET',
    },
  };

  if (event.queryStringParameters.region) {
    param.secret.region = event.queryStringParameters.region;
  }

  return param;
};
