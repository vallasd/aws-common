exports.action = (secret) => { // eslint-disable-line
  return {
    response: {
      headers: { 'Content-Type': 'text/plain' },
      body: secret,
      statusCode: 200,
    },
  };
};
