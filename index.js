const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.jd5uu0i.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", (req, res) => {
  res.send("Listening from plateShare backend");
});

async function run() {
  try {
    await client.connect();

    const database = client.db("plateShare_db");
    const foodsCollection = database.collection("foods");
    const usersCollection = database.collection("users");

    app.post("/foods", async (req, res) => {
      const newFood = req.body;
      const result = await foodsCollection.insertOne(newFood);
      res.send(result);
    });

    app.get("/foods", async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { "donator.email": email };
      }
      const cursor = foodsCollection.find(query).sort({ quantity: -1 });
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/featuredFoods", async (req, res) => {
      const cursor = foodsCollection.find().sort({ quantity: -1 }).limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.delete("foods/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodsCollection.deleteOne(query);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`PlateShare app listening on port ${port}`);
});
