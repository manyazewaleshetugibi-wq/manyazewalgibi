import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;

// Only throw error if we're not in build phase and URI is missing
if (!MONGODB_URI && process.env.NEXT_PHASE !== 'phase-production-build') {
  throw new Error("MongoDB URI is required");
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 1000000,
  socketTimeoutMS: 45000,
};

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

// For build phase, return a mock promise
if (process.env.NEXT_PHASE === 'phase-production-build') {
  // Create a mock client that won't fail during build
  clientPromise = Promise.resolve({
    db: () => ({
      collection: () => ({
        find: () => ({ toArray: () => Promise.resolve([]) }),
        findOne: () => Promise.resolve(null),
        insertOne: () => Promise.resolve({ insertedId: 'mock' }),
        updateOne: () => Promise.resolve({ modifiedCount: 0 }),
        deleteOne: () => Promise.resolve({ deletedCount: 0 }),
        aggregate: () => Promise.resolve([]),
        countDocuments: () => Promise.resolve(0),
        findOneAndUpdate: () => Promise.resolve(null),
        findOneAndDelete: () => Promise.resolve(null),
      })
    }),
    close: () => Promise.resolve()
  } as unknown as MongoClient);
} else if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise && MONGODB_URI) {
    client = new MongoClient(MONGODB_URI, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise!;
} else {
  if (MONGODB_URI) {
    client = new MongoClient(MONGODB_URI, options);
    clientPromise = client.connect();
  } else {
    // Create a mock promise for production without URI
    clientPromise = Promise.reject(new Error("MongoDB URI is not configured"));
  }
}

export default clientPromise;