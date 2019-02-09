exports.action = (event) => {
  const { body } = event;
  const { table, keys } = body;

  return {
    dynamo: {
      method: 'DELETE',
      table,
      keys,
    },
  };
};
