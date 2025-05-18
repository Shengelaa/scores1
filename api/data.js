import { MongoClient } from "mongodb";

// Make sure the MongoDB URI is set in environment variables
if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI is not defined in environment variables");
}

const uri = process.env.MONGODB_URI;
const options = {};

let client;
let clientPromise;

// Use MongoDB client only once
if (!global._mongoClientPromise) {
  client = new MongoClient(uri, options);
  global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("mydb"); // Change this if your DB is named differently
    const collection = db.collection("entries");

    // Set CORS headers to allow requests from your frontend
    res.setHeader("Access-Control-Allow-Origin", "*");  // You may specify only your frontend URL here
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Allow pre-flight OPTIONS requests
    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    if (req.method === "GET") {
      // Aggregate the scores for each player
      const data = await collection.aggregate([
        {
          $group: {
            _id: "$name", // Group by player name
            totalScore: { $sum: "$score" }, // Sum the scores for each player
          },
        },
        {
          $sort: { totalScore: -1 }, // Sort by totalScore in descending order
        },
        {
          $limit: 3, // Limit the result to the top 3 players
        },
      ]).toArray();

      // Send the top 3 players with the most total scores
      return res.status(200).json(data);
    }

    if (req.method === "POST") {
      const body =
        typeof req.body === "string" ? JSON.parse(req.body) : req.body;

      // Insert the new score entry for the player
      const result = await collection.insertOne(body);
      
      // Return just the inserted object
      return res.status(201).json(result.ops[0]);
    }

    // Handle unsupported HTTP methods
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: error.message });
  }
}
