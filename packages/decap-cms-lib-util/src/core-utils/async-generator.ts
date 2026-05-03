export const toArray = async <T>(gen: AsyncGenerator<T>): Promise<T[]> => {
  const result: T[] = [];
  for await (const item of gen) {
    result.push(item);
  }
  return result;
};

export const first = async <T>(gen: AsyncGenerator<T>): Promise<T | undefined> => {
  for await (const item of gen) {
    return item;
  }
  return undefined;
};
