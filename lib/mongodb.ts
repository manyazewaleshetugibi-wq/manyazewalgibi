import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;

// DO NOT throw during build (this is what breaks Vercel builds)
if (!MONGODB_URI && process.env.NODE_ENV === "production") {
  throw new Error("MongoDB URI is required in production");
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 1000000,
  socketTimeoutMS: 45000,
};

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

// SAFE MOCK ONLY FOR BUILD TIME (prevents crash)
const createMockClient = (): any => ({
  db: () => ({
    collection: () => ({
      find: () => ({ toArray: async () => [] }),
      findOne: async () => null,
      insertOne: async () => ({ insertedId: "mock" }),
      updateOne: async () => ({ modifiedCount: 0 }),
      deleteOne: async () => ({ deletedCount: 0 }),
      aggregate: () => ({
        toArray: async () => [],
        next: async () => null,
      }),
      countDocuments: async () => 0,
      findOneAndUpdate: async () => null,
      findOneAndDelete: async () => null,
    }),
  }),
  close: async () => {},
});

// ---------------------------
// SAFE INIT LOGIC
// ---------------------------

// 1. BUILD TIME SAFE MODE
if (!MONGODB_URI) {
  clientPromise = Promise.resolve(createMockClient());
}

// 2. DEVELOPMENT MODE
else if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(MONGODB_URI, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
}

// 3. PRODUCTION MODE
else {
  client = new MongoClient(MONGODB_URI, options);
  clientPromise = client.connect();
}

export default clientPromise;