exports.action = (event) => {
  const { body } = event;
  const { table, keys, values } = body;

  return {
    dynamo: {
      method: 'UPDATE',
      table,
      keys,
      values,
    },
  };
};
