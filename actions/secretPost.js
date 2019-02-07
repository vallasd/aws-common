exports.action = (event) => { // eslint-disable-line
  if (event.queryStringParameters.region) {
    process.env.region = event.queryStringParameters.region;
  }

  return {
    secret: {
      secretString: event.body,
      method: 'POST',
    },
  };
};
