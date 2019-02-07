exports.action = () => { // eslint-disable-line
  return {
    response: {
      headers: { 'Content-Type': 'text/xml' },
      body: '<xml><message>Test Passed</message></xml>',
      statusCode: 200,
    },
  };
};
