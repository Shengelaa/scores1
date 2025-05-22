import { MongoClient } from "mongodb";

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
      const data = await collection
        .find()
        .sort({ score: -1 })
        .limit(3)
        .toArray();

      return res.status(200).json(
        data.map((entry) => ({
          _id: entry._id,
          score: entry.score,
        }))
      );
    }

    if (req.method === "POST") {
      const body =
        typeof req.body === "string" ? JSON.parse(req.body) : req.body;

      if (!body.name || body.score === undefined) {
        return res.status(400).json({ error: "Name and score are required" });
      }

      const name = body.name;
      const score = body.score;

      // Upsert the document with name as _id
      const existing = await collection.findOne({ _id: name });

      if (existing) {
        // Only update if the new score is higher
        if (score > existing.score) {
          await collection.updateOne({ _id: name }, { $set: { score } });
        }
      } else {
        await collection.insertOne({ _id: name, score });
      }

      // Get top 3 scores
      const top3 = await collection
        .find()
        .sort({ score: -1 })
        .limit(3)
        .toArray();

      // Keep only top 3 by deleting others
      await collection.deleteMany({
        _id: { $nin: top3.map((entry) => entry._id) },
      });

      return res.status(201).json(
        top3.map((entry) => ({
          _id: entry._id,
          score: entry.score,
        }))
      );
    }

    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: error.message });
  }
}
