exports.action = (event) => {
  const { body } = event;
  const { numbers, message } = body;

  return {
    sms: {
      numbers,
      message,
    },
  };
};
