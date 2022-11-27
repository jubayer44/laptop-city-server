const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const port = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.brpx2ub.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

//JWT Verification
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    const categoriesCollection = client.db("laptopDb").collection("categories");
    const productsCollection = client.db("laptopDb").collection("products");
    const usersCollection = client.db("laptopDb").collection("users");
    const bookingsCollection = client.db("laptopDb").collection("bookings");
    const reportsCollection = client.db("laptopDb").collection("reports");

    //Admin Verification
    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const user = await usersCollection.findOne({ email: decodedEmail });
      if (user.role !== "Admin") {
        return res.status(403).send({ message: "Forbidden access" });
      }
      next();
    };

    app.get("/users/admin/:email", async (req, res) => {
      const { email } = req.params;
      const user = await usersCollection.findOne({ email: email });
      res.send({ isAdmin: user?.role === "Admin" });
    });

    //Get JWT token
    app.get("/jwt", async (req, res) => {
      const { email } = req.query;
      const user = await usersCollection.findOne({ email: email });
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "1d",
        });
        return res.send({ access_token: token });
      } else {
        return res.status(403).send({ message: "Forbidden Access" });
      }
    });

    //All Categories find here
    app.get("/categories", async (req, res) => {
      const results = await categoriesCollection.find({}).toArray();
      res.send(results);
    });

    //Add a Product routes, single category find here
    app.get("/categories/:id", async (req, res) => {
      const category = req.params.id;
      const result = await categoriesCollection.findOne({
        CategoryName: category,
      });
      res.send(result);
    });

    //Category Products routes,
    app.get("/products", async (req, res) => {
      const { id } = req.query;
      const results = await productsCollection
        .find({ categoryId: id })
        .toArray();
      const unsold = results.filter((result) => result?.sold !== true);
      res.send(unsold);
    });

    //Add a user to the database
    app.put("/users", async (req, res) => {
      const user = req.body;
      const email = user.email;
      const filter = await usersCollection.findOne({ email: email });
      if (filter) {
        const message = "Already added user";
        return res.send({ acknowledged: false, message });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    //Get all Sellers and Buyers
    app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
      const { role } = req.query;
      const result = await usersCollection.find({ role: role }).toArray();
      res.send(result);
    });

    //Verified a Seller
    app.put('/userVerify', verifyJWT, verifyAdmin, async (req, res) => {
        const id = req.query.id;
        const filter = {_id: ObjectId(id)};
        // const result = await usersCollection.findOne(filter)
        // console.log(result);
        const options = {upsert : true};
        const updatedDoc = {
            $set: {
                isVerified: true
            }
        }
        const result = await usersCollection.updateOne(filter, updatedDoc, options);
        res.send(result);
        console.log(result);
    });

    //Delete a user from the database
    app.delete("/user/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const result = await usersCollection.deleteOne({ _id: ObjectId(id) });
      res.send(result);
    });

    //Get a user from the database
    app.get("/user", async (req, res) => {
      const { email } = req.query;
      const user = await usersCollection.findOne({ email: email });
      res.send(user);
    });

    //Bookings Products routes
    app.post("/bookings", verifyJWT, async (req, res) => {
      const { email } = req.query;
      const booking = req.body;
      const filter = { userEmail: email, bookingId: booking.bookingId };
      const product = await bookingsCollection.findOne(filter);
      if (product) {
        const message = "You have already booked the product";
        return res.send({ acknowledged: false, message });
      }
      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    });

    //Get user bookings with user email
    app.get("/myorders", verifyJWT, async (req, res) => {
      const { email } = req.query;
      const bookings = await bookingsCollection
        .find({ userEmail: email })
        .toArray();
      res.send(bookings);
    });

    //Delete a bookings product
    app.delete("/myOrders/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const result = await bookingsCollection.deleteOne({ _id: ObjectId(id) });
      res.send(result);
    });

    //Add a Product route
    app.post("/addProduct", verifyJWT, async (req, res) => {
      const data = req.body;
      const product = await productsCollection.insertOne(data);
      res.send(product);
    });

    //Get Seller Products routes
    app.get("/myProducts", verifyJWT, async (req, res) => {
      const { email } = req.query;
      const results = await productsCollection
        .find({ sellerEmail: email })
        .toArray();
      res.send(results);
    });

    //Add a Product to the advertise section
    app.put("/advertise/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const product = await productsCollection.findOne(filter);
      const advertise = product.isAdvertised;
      if (advertise) {
        return res.send({
          acknowledged: false,
          message: "Already added to advertise",
        });
      }
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          isAdvertised: true,
        },
      };
      const result = await productsCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    //Get Advertise products from the database
    app.get("/advertise", async (req, res) => {
      const items = await productsCollection
        .find({ isAdvertised: true })
        .toArray();
      const results = items.filter((item) => item.sold !== true);
      res.send(results);
    });

    //Delete from my Products
    app.delete("/advertise", verifyJWT, async (req, res) => {
      const { id } = req.query;
      const result = await productsCollection.deleteOne({ _id: ObjectId(id) });
      res.send(result);
    });

    //Payment Route
    app.get("/dashboard/payment/:id", verifyJWT, async (req, res) => {
      const id = req.params;
      const filter = { _id: ObjectId(id) };
      const result = await bookingsCollection.findOne(filter);
      res.send(result);
    });

    //Stripe Payment Route
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const booking = req.body;
      const price = booking.productPrice;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        currency: "usd",
        amount: amount,
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    //After payment success bookingsCollection and productsCollection updated
    app.put("/payments", verifyAdmin, async (req, res) => {
      const { id } = req.query;
      const payment = req.body;
      const filter = { bookingId: id };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          sold: true,
          paymentEmail: payment.userEmail,
        },
      };
      const result = await bookingsCollection.updateMany(
        filter,
        updateDoc,
        options
      );
      const filtr = { _id: ObjectId(id) };
      const reslt = await productsCollection.updateOne(
        filtr,
        updateDoc,
        options
      );
      res.send(result);
    });

    //Report a Product
    app.post("/report", async (req, res) => {
      const data = req.body;
      const filter = { email: data?.email, reportedId: data.reportedId };
      const findProduct = await reportsCollection.findOne(filter);
      if (findProduct) {
        return res.send({
          acknowledged: false,
          message: "You have already reported this product",
        });
      } else {
        const result = await reportsCollection.insertOne(data);
        res.send(result);
      }

      const CProductFilter = { _id: ObjectId(data.reportedId) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          reported: true,
        },
      };
      const updateProduct = await productsCollection.updateOne(
        CProductFilter,
        updatedDoc,
        options
      );
    });

    //Get all Reported products
    app.get('/report', verifyJWT, verifyAdmin, async (req, res) => {
        const results = await reportsCollection.find({}).toArray();
        res.send(results);
    });

    //Delete reported products
    app.delete('/report/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params;
            const data = req.body;
            const reportFilter = {_id: ObjectId(id), email: data.item.email};
            const productFilter = {_id: ObjectId(data.item.reportedId)}
            const findReport = await reportsCollection.deleteOne(reportFilter);
            const findProduct = await productsCollection.deleteOne(productFilter);
    });

  } finally {
  }
}
run().catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.listen(port, () => {
  console.log(`server listening on port${port}`);
});
