import { MongoClient } from "mongodb";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/eresto_new";

if (!MONGO_URI) {
  throw new Error("Please define the MONGO_URI environment variable in your .env file");
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// Check if the environment is development or production
if (process.env.NODE_ENV === "development") {
  // In development, use a global variable to preserve the client across hot reloads
  if (!(global as any)._mongoClientPromise) {
    client = new MongoClient(MONGO_URI);
    (global as any)._mongoClientPromise = client.connect();
  }
  clientPromise = (global as any)._mongoClientPromise;
} else {
  // In production, create a new client
  client = new MongoClient(MONGO_URI);
  clientPromise = client.connect();
}

export default clientPromise;
