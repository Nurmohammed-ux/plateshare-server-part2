const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const port = process.env.PORT || 3000;

const app = express();

app.use(cors());
app.use(express.json());

/* ---------------- Firebase Admin ---------------- */

try {
  const serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_KEY, "base64").toString("utf8"),
  );

  initializeApp({
    credential: cert(serviceAccount),
  });

  console.log("Firebase initialized");
} catch (err) {
  console.error(err);
}

/* ---------------- JWT Middleware ---------------- */

const verifyFirebaseToken = async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).send({
      message: "Unauthorized access",
    });
  }

  const token = authorization.split(" ")[1];

  try {
    const decoded = await getAuth().verifyIdToken(token);

    req.token_email = decoded.email;

    next();
  } catch (err) {
    return res.status(401).send({
      message: "Invalid token",
    });
  }
};

/* ---------------- MongoDB ---------------- */

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.jd5uu0i.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let foodsCollection;
let usersCollection;

async function connectDB() {
  if (!foodsCollection) {
    await client.connect();

    console.log("MongoDB Connected");

    const database = client.db("plateShare_db");

    foodsCollection = database.collection("foods");
    usersCollection = database.collection("users");
  }
}

/* ---------------- Routes ---------------- */

app.get("/", (req, res) => {
  res.send("PlateShare Server Running");
});

/* Get All Foods */

app.get("/foods", async (req, res) => {
  try {
    await connectDB();

    const email = req.query.email;

    const query = email ? { "donator.email": email } : {};

    const result = await foodsCollection
      .find(query)
      .sort({ quantity: -1 })
      .toArray();

    res.send(result);
  } catch (err) {
    console.error(err);

    res.status(500).send({
      message: err.message,
    });
  }
});

/* Get Single Food */

app.get("/foods/:id", async (req, res) => {
  try {
    await connectDB();

    const result = await foodsCollection.findOne({
      _id: new ObjectId(req.params.id),
    });

    res.send(result);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
});

/* Featured Foods */

app.get("/featuredFoods", async (req, res) => {
  try {
    await connectDB();

    const result = await foodsCollection
      .find()
      .sort({ quantity: -1 })
      .limit(6)
      .toArray();

    res.send(result);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
});

/* Add Food */

app.post("/foods", verifyFirebaseToken, async (req, res) => {
  try {
    await connectDB();
    const email = req.body.donator.email;
    const newFood = req.body;

    if (email !== req.token_email) {
      return res.status(403).send({
        message: "Forbidden access",
      });
    }

    const result = await foodsCollection.insertOne(newFood);

    res.send(result);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
});

/* My Foods */

app.get("/myFoods", verifyFirebaseToken, async (req, res) => {
  try {
    await connectDB();

    const email = req.query.email;

    if (email !== req.token_email) {
      return res.status(403).send({
        message: "Forbidden access",
      });
    }

    const result = await foodsCollection
      .find({
        "donator.email": email,
      })
      .sort({
        quantity: -1,
      })
      .toArray();

    res.send(result);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
});

/* Update Food */

app.patch("/foods/:id", verifyFirebaseToken, async (req, res) => {
  try {
    await connectDB();

    const query = {
      _id: new ObjectId(req.params.id),
    };

    const food = await foodsCollection.findOne(query);

    if (!food) {
      return res.status(404).send({
        message: "Food not found",
      });
    }

    if (food.donator.email !== req.token_email) {
      return res.status(403).send({
        message: "Forbidden access",
      });
    }

    const result = await foodsCollection.updateOne(query, {
      $set: req.body,
    });

    res.send(result);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
});

/* Delete Food */

app.delete("/foods/:id", verifyFirebaseToken, async (req, res) => {
  try {
    await connectDB();

    const query = {
      _id: new ObjectId(req.params.id),
    };

    const food = await foodsCollection.findOne(query);

    if (!food) {
      return res.status(404).send({
        message: "Food not found",
      });
    }

    if (food.donator.email !== req.token_email) {
      return res.status(403).send({
        message: "Forbidden access",
      });
    }

    const result = await foodsCollection.deleteOne(query);

    res.send(result);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
});

/* ---------------- Export ---------------- */

module.exports = app;
// app.listen(port, () => {
//   console.log(`PlateShare app listening on port ${port}`);
// });
