export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("mydb"); // Change this if your DB is named differently
    const collection = db.collection("entries");

    // Set CORS headers to allow requests from your frontend
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Allow pre-flight OPTIONS requests
    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    // Handle GET requests to fetch the top 3 players
    if (req.method === "GET") {
      // Fetch top 3 players sorted by score in descending order
      const data = await collection
        .find()
        .sort({ score: -1 }) // Sort by score in descending order
        .limit(3) // Limit to top 3 players
        .toArray();

      // Transform data to only include 'name' and '_id', use name as _id
      const transformedData = data.map((entry) => ({
        _id: entry.name, // Use name as _id
        name: entry.name, // Include the name
      }));

      // Return the transformed data directly (no success: true wrapper)
      return res.status(200).json(transformedData);
    }

    // Handle POST requests to add a new score
    if (req.method === "POST") {
      const body =
        typeof req.body === "string" ? JSON.parse(req.body) : req.body;

      // Insert the new score into the collection
      const result = await collection.insertOne(body);

      // After inserting the new score, get the top 3 players
      const top3 = await collection
        .find()
        .sort({ score: -1 }) // Sort by score in descending order
        .limit(3) // Limit to top 3 players
        .toArray();

      // Delete all other players to keep only the top 3 in the collection
      await collection.deleteMany({
        _id: { $nin: top3.map((entry) => entry._id) }, // Delete all except the top 3
      });

      // Transform top 3 players to only include 'name' and '_id', use name as _id
      const transformedTop3 = top3.map((entry) => ({
        _id: entry.name, // Use name as _id
        name: entry.name, // Include the name
      }));

      // Return the transformed top 3 players directly (no success wrapper)
      return res.status(201).json(transformedTop3);
    }

    // Handle unsupported HTTP methods
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: error.message }); // No 'success: false' wrapper
  }
}
