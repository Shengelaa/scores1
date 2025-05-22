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

      const top3 = await collection
        .find()
        .sort({ score: -1 })
        .limit(3)
        .toArray();
      const lowestTopScore = top3[2]?.score ?? -Infinity;

      if (top3.length < 3 || score >= lowestTopScore) {
        // Remove if name already exists (avoid dup _id errors)
        await collection.deleteOne({ _id: name });

        // Insert new score
        await collection.insertOne({ _id: name, score });

        // Clean up: only keep top 3
        const newTop3 = await collection
          .find()
          .sort({ score: -1 })
          .limit(3)
          .toArray();
        await collection.deleteMany({
          _id: { $nin: newTop3.map((entry) => entry._id) },
        });

        return res.status(201).json(
          newTop3.map((entry) => ({
            _id: entry._id,
            score: entry.score,
          }))
        );
      } else {
        // Score not high enough to make top 3
        return res
          .status(403)
          .json({ error: "Score not high enough for top 3" });
      }
    }

    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: error.message });
  }
}
