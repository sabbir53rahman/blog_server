const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: "https://blog-site-v1cc.onrender.com",
    credentials: true,
  })
);
app.use(express.json());

console.log("DB User:", process.env.DB_USER);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.at16f.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const usersCollection = client.db("BlogUserDB").collection("users");
    const blogCollection = client.db("BlogDB").collection("blogs");

    // Register a new user
    app.post("/users", async (req, res) => {
      const user = req.body;
      const existingUser = await usersCollection.findOne({ email: user.email });

      if (existingUser) {
        return res.send({ message: "User already exists", insertedId: null });
      }

      const result = await usersCollection.insertOne(user);
      const newUser = await usersCollection.findOne({ _id: result.insertedId });

      res.send({
        message: "User created successfully",
        data: newUser,
      });
    });

    // Get all users
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // Check if the user is an admin
    app.get("/isAdmin/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const user = await usersCollection.findOne({ email });

        if (!user) {
          return res.status(404).send({ message: "User not found" });
        }

        res.send({ isAdmin: user.role === "admin" });
      } catch (error) {
        res.status(500).send({ message: "Server error", error: error.message });
      }
    });

    // Get current user by email
    app.post("/currentUser", async (req, res) => {
      const { email, password } = req.body;
      const user = await usersCollection.findOne({ email });

      if (!user) {
        return res.status(400).send({ message: "User doesn't exist.", data: null });
      }

      if (user.password !== password) {
        return res.status(400).send({ message: "Incorrect password.", data: null });
      }

      res.send({
        message: "User found successfully.",
        data: user,
      });
    });

    // Submit a New Blog (Initially Pending)
    app.post("/blogs", async (req, res) => {
      const blog = req.body;
      blog.status = "pending"; // Mark as pending initially
      const result = await blogCollection.insertOne(blog);
      res.send(result);
    });

    // Get All Blogs (Pending & Approved)
    app.get("/blogs", async (req, res) => {
      const blogs = await blogCollection.find().toArray();
      res.send(blogs);
    });

    // Get Only Pending Blogs
    app.get("/blogs/pending", async (req, res) => {
      const blogs = await blogCollection.find({ status: "pending" }).toArray();
      res.send(blogs);
    });

    // Get Only Approved Blogs
    app.get("/blogs/approved", async (req, res) => {
      const blogs = await blogCollection.find({ status: "approved" }).toArray();
      res.send(blogs);
    });

    // Get a Single Blog by ID
    app.get("/blogs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const blog = await blogCollection.findOne(query);
      res.send(blog);
    });

    // Delete a Blog by ID
    app.delete("/blogs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await blogCollection.deleteOne(query);
      res.send(result);
    });

    // Approve a Blog (Update Status)
    app.patch("/blogs/approve/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const update = { $set: { status: "approved" } };
      const result = await blogCollection.updateOne(query, update);
      res.send(result);
    });

    app.get("/", (req, res) => {
      res.send("Blog server is running");
    });

    app.listen(port, () => {
      console.log(`Blog server is running on port ${port}`);
    });
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

run().catch(console.dir);
