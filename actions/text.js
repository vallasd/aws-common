exports.action = () => { // eslint-disable-line
  return {
    response: {
      headers: { 'Content-Type': 'text/plain' },
      body: 'Test Passed',
      statusCode: 200,
    },
  };
};
