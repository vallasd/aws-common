exports.action = (event) => {
  const { body } = event;
  const { keys, deviceTypes, message } = body;

  return {
    push: {
      keys,
      deviceTypes,
      message,
    },
  };
};
