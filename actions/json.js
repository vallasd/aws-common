exports.action = () => { // eslint-disable-line
  const body = {
    message: 'Test Passed',
  };

  return {
    response: {
      headers: { 'Content-Type': 'text/json' },
      body,
      statusCode: 200,
    },
  };
};
