const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.brpx2ub.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try {
        const categoriesCollection = client.db("laptopDb").collection("categories");
        const productsCollection = client.db("laptopDb").collection("products");
        const usersCollection = client.db("laptopDb").collection("users");

        app.get('/categories', async (req, res) => {
            const results = await categoriesCollection.find({}).toArray();
            res.send(results);
        });
        app.get('/products', async (req, res) => {
            const {id} = req.query;
            const results = await productsCollection.find({categoryId: id}).toArray();
            res.send(results);
        });

        app.put('users', async (req, res) => {
            const user = req.body;
            const result = usersCollection.insertOne(user);
            res.send(result);
        });
    }
    finally {

    }
};
run().catch(err => console.log(err));



app.get('/', (req, res) => {
    res.send('Server is running')
});

app.listen(port, () => {
    console.log(`server listening on port${port}`);
});

