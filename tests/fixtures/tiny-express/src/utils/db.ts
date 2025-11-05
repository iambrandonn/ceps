let dbConnection: any = null;

export async function getDb() {
  if (!dbConnection) {
    // Mock database connection
    dbConnection = {
      collection: (name: string) => ({
        find: () => ({ toArray: async () => [] }),
        findOne: async (query: any) => null,
        insertOne: async (doc: any) => ({ insertedId: 'mock-id' })
      })
    };
  }
  return dbConnection;
}
