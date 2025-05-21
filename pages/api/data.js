import { MongoClient } from "mongodb";

// Make sure the MongoDB URI is set in environment variables
if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI is not defined in environment variables");
}

const uri = process.env.MONGODB_URI;
const options = {};

let client;
let clientPromise;

if (!global._mongoClientPromise) {
  client = new MongoClient(uri, options);
  global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("mydb");
    const collection = db.collection("entries");

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    if (req.method === "GET") {
      const data = await collection.find().toArray();
      return res.status(200).json(data); // return all data
    }

    if (req.method === "POST") {
      const body =
        typeof req.body === "string" ? JSON.parse(req.body) : req.body;

      const result = await collection.insertOne(body);
      return res.status(201).json({ insertedId: result.insertedId });
    }

    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: error.message });
  }
}
