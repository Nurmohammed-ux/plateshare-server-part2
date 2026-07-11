const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 3000;
const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

try {
  const decoded = Buffer.from(
    process.env.FIREBASE_SERVICE_KEY,
    "base64",
  ).toString("utf8");

  const serviceAccount = JSON.parse(decoded);

  initializeApp({
    credential: cert(serviceAccount),
  });

  console.log("Firebase initialized");
} catch (err) {
  console.error("Firebase init failed:", err);
}

// middleware
app.use(cors());
app.use(express.json());

const verifyFirebaseToken = async (req, res, next) => {
  const authorization = req.headers.authorization;
  // console.log(authorization);
  if (!authorization) {
    return res
      .status(401)
      .send({ message: "Unauthorized access: No token provided" });
  }
  const token = authorization.split(" ")[1];
  try {
    const decoded = await getAuth().verifyIdToken(token);
    req.token_email = decoded.email;
    next();
  } catch (error) {
    console.error("Firebase Auth Error:", error.message);
    return res
      .status(401)
      .send({ message: "Unauthorized access: Invalid provided" });
  }
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.jd5uu0i.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const database = client.db("plateShare_db");
const foodsCollection = database.collection("foods");
const usersCollection = database.collection("users");

client
  .connect()
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch(console.error);

app.get("/", (req, res) => {
  res.send("Listening from plateShare backend");
});

app.get("/foods", async (req, res) => {
  try {
    const email = req.query.email;
    let query = {};
    if (email) {
      query = { "donator.email": email };
    }
    const cursor = foodsCollection.find(query).sort({ quantity: -1 });
    const result = await cursor.toArray();
    res.send(result);
  } catch (err) {
    console.error("GET /foods/:id error:", err);
    res.status(500).send({
      message: err.message,
    });
  }
});

// async function run() {
//   try {
//     await client.connect();

//     // const database = client.db("plateShare_db");
//     // const foodsCollection = database.collection("foods");
//     // const usersCollection = database.collection("users");

//     app.post("/foods", verifyFirebaseToken, async (req, res) => {
//       const email = req.body.donator.email;
//       if (email !== req.token_email) {
//         return res.status(403).send({ message: "Forbidden access" });
//       }
//       const newFood = req.body;
//       const result = await foodsCollection.insertOne(newFood);
//       res.send(result);
//     });

//     app.get("/foods", async (req, res) => {
//       const email = req.query.email;
//       let query = {};
//       if (email) {
//         query = { "donator.email": email };
//       }
//       const cursor = foodsCollection.find(query).sort({ quantity: -1 });
//       const result = await cursor.toArray();
//       res.send(result);
//     });

//     app.get("/foods/:id", async (req, res) => {
//       const id = req.params.id;
//       const query = { _id: new ObjectId(id) };
//       const result = await foodsCollection.findOne(query);
//       res.send(result);
//     });

//     app.get("/featuredFoods", async (req, res) => {
//       const cursor = foodsCollection.find().sort({ quantity: -1 }).limit(6);
//       const result = await cursor.toArray();
//       res.send(result);
//     });

//     app.get("/myFoods", verifyFirebaseToken, async (req, res) => {
//       const email = req.query.email;
//       if (!email) {
//         return res.status(400).send({ message: "Email is required" });
//       }

//       if (email !== req.token_email) {
//         return res.status(403).send({ message: "Forbidden access" });
//       }

//       const query = {
//         "donator.email": email,
//       };

//       const result = await foodsCollection
//         .find(query)
//         .sort({ quantity: -1 })
//         .toArray();
//       res.send(result);
//     });

//     app.patch("/foods/:id", verifyFirebaseToken, async (req, res) => {
//       const id = req.params.id;
//       const updatedFood = req.body;
//       const query = { _id: new ObjectId(id) };
//       const food = await foodsCollection.findOne(query);
//       if (!food) {
//         return res.status(404).send({ message: "Food not found" });
//       }

//       if (food.donator.email !== req.token_email) {
//         return res.status(403).send({ message: "Forbidden access" });
//       }

//       const updateDoc = {
//         $set: updatedFood,
//       };
//       const result = await foodsCollection.updateOne(query, updateDoc);
//       res.send(result);
//     });

//     app.delete("/foods/:id", verifyFirebaseToken, async (req, res) => {
//       const id = req.params.id;
//       const query = { _id: new ObjectId(id) };

//       const food = await foodsCollection.findOne(query);
//       if (!food) {
//         return res.status(404).send({ message: "Food not found." });
//       }

//       if (food.donator.email !== req.token_email) {
//         return res.status(403).send({ message: "Forbidden access" });
//       }

//       const result = await foodsCollection.deleteOne(query);
//       res.send(result);
//     });

//     // await client.db("admin").command({ ping: 1 });
//     console.log(
//       "Pinged your deployment. You successfully connected to MongoDB!",
//     );
//   } finally {
//   }
// }

// run().catch(console.dir);

// app.listen(port, () => {
//   console.log(`PlateShare app listening on port ${port}`);
// });

module.exports = app;
