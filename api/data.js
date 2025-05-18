// /api/data.js
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

export default async function handler(req, res) {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }
    if (!client.isConnected?.()) await client.connect();
    const db = client.db("mydb");
    const collection = db.collection("entries");

    if (req.method === "GET") {
      const data = await collection.find().toArray();
      return res.status(200).json({ success: true, data });
    }

    if (req.method === "POST") {
      const body = JSON.parse(req.body);
      const result = await collection.insertOne(body);
      return res
        .status(201)
        .json({ success: true, insertedId: result.insertedId });
    }

    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
}
