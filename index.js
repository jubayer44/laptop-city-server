const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.brpx2ub.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if(!authHeader){
        return res.status(401).send({message: 'unauthorized access'});
    }
   const token = authHeader.split(' ')[1];
   jwt.verify(token, process.env.ACCESS_TOKEN, function(err, decoded){
    if(err){
        return res.status(403).send({message: 'Forbidden access'})
    }
    req.decoded = decoded;
    next();
   })
}



async function run(){
    try {
        const categoriesCollection = client.db("laptopDb").collection("categories");
        const productsCollection = client.db("laptopDb").collection("products");
        const usersCollection = client.db("laptopDb").collection("users");
        const bookingsCollection = client.db("laptopDb").collection("bookings");

        app.get("/jwt", async (req, res)=>{
            const {email} = req.query;
            const user = await usersCollection.findOne({email: email});
            if(user){
              const token = jwt.sign({email}, process.env.ACCESS_TOKEN, {expiresIn: '1d'})
              return res.send({access_token: token})
            }
            else {
              return res.status(403).send({message: 'Forbidden Access'});
            }
          })

        app.get('/categories', async (req, res) => {
            const results = await categoriesCollection.find({}).toArray();
            res.send(results);
        });

        app.get('/categories/:id', async (req, res) => {
            const category = req.params.id;
            const result = await categoriesCollection.findOne({CategoryName: category});
            res.send(result);
        });

        app.get('/products', async (req, res) => {
            const {id} = req.query;
            const results = await productsCollection.find({categoryId: id}).toArray();
            res.send(results);
        });

        app.put('/users', async (req, res) => {
            const user = req.body;
            const email = user.email;
            const filter =await usersCollection.findOne({email: email});
            if(filter){
                const message = "added"
                return res.send({acknowledged: false, message})
            }
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        app.get('/user', async (req, res) => {
            const {email} = req.query;
            const user = await usersCollection.findOne({email: email});
            res.send(user);            
        });

        app.post('/bookings', async (req, res) => {
            const {email} = req.query;
            const booking = req.body;
            const filter = {userEmail: email, bookingId: booking.bookingId}
            const product = await bookingsCollection.findOne(filter);
            if(product){
                const message = "This product has already been added"
                return res.send({acknowledged: false, message});
            }
            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        });

        app.get('/myorders',verifyJWT, async (req, res) => {
            const {email} = req.query;
            const bookings = await bookingsCollection.find({userEmail: email}).toArray();
            res.send(bookings);
        });

        app.post('/addProduct', async (req, res) => {
            const data = req.body;
            const product = await productsCollection.insertOne(data);
            res.send(product);
        });

        app.get('/myProducts',verifyJWT, async (req, res) => {
            const {email} = req.query;
            const results = await productsCollection.find({sellerEmail: email}).toArray();
            res.send(results);
        });

        app.put('/advertise/:id', async (req, res)=> {
            const id = req.params.id;
            const filter = {_id: ObjectId(id)}
            const product = await productsCollection.findOne(filter)
            const advertise = product.isAdvertised;
            if(advertise){
                return res.send({acknowledged: false, message: "Already added to advertise"})
            }
            const options = {upsert: true}
            const updatedDoc = {
                $set: {
                    isAdvertised: true
                }
            }
            const result = await productsCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });

        app.get('/advertise', async (req, res) => {
            const result = await productsCollection.find({isAdvertised: true}).toArray();
            res.send(result);
        })

        app.delete('/advertise', async (req, res) => {
            const {id} = req.query;
            const result = await productsCollection.deleteOne({_id: ObjectId(id)})
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

