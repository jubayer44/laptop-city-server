const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.brpx2ub.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try {
        const categoriesCollection = client.db('laptopDb').collection('categories')
        
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

