const express = require('express')
const app = express()
const admin = require("firebase-admin");
const cors = require('cors');
require('dotenv').config();
const { MongoClient } = require('mongodb');

const port = process.env.PORT || 5000

// doctors-portal-firebase-adminsdk.json


// var serviceAccount = require('./doctors-portal-firebase-adminsdk.json');
// var serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


app.use(cors());
//last step
app.use(express.json()); 

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xc3fq.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
console.log(client);

// async function verifyToken(req,res,next){
//   if(req.headers?.authorization?.startsWith('Bearer ')){
//     const token = req.headers.authorization.split(' ')[1];
//     console.log('This this token',token);
//     try{
//       const decodedUser = await admin.auth().varifyIdToken(token);
//       console.log('Decode user' ,decodedUser);
//       req.decodedEmail = decodedUser.email;
//     }
//     catch{
        
//     }
//     }//optional chaining to prevent error

//   next();

// }
async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith('Bearer ')) {
      const token = req.headers.authorization.split(' ')[1];

      try {
          const decodedUser = await admin.auth().verifyIdToken(token);
          req.decodedEmail = decodedUser.email;
      }
      catch {

      }

  }
  next();
}
async function run(){
    try {
        await client.connect();
        console.log('database connected successfully');
        const database = client.db('doctors_portal');//database name
        const appointmentsCollection = database.collection('appointments');
        const usersCollection = database.collection('users');

        app.get('/appointments',verifyToken,async(req,res)=>{
          const email = req.query.email;
          const date = new Date(req.query.date).toLocaleDateString();
          console.log(date);
          const query = {email:email,date:date} // to get specific item
          const cursor = appointmentsCollection.find(query);//multiple items
          const appointments = await cursor.toArray();
          res.json(appointments); // all appointments will get* 
        })

        app.post('/appointments',async(req,res)=>{
          const appointment = req.body;
          //2nd attemp inserting into mongoDb
          const result = await appointmentsCollection.insertOne(appointment);
          console.log(result);
          console.log(appointment);
          res.json(result) //sending this to frontEnd!*
        })

        app.get('/users/:email', async (req, res) => {
          const email = req.params.email;
          const query = { email: email };
          const user = await usersCollection.findOne(query);
          let isAdmin = false;
          if (user?.role === 'admin') {
              isAdmin = true;
          }
          res.json({ admin: isAdmin });
      })

       

        app.post('/users',async(req,res)=>{
          const user = req.body;
          const result = await usersCollection.insertOne(user);
          console.log(result);
          res.json(result);
        });

        app.put('/users',async(req,res)=>{
          const user = req.body;
          const filter = {email:user.email};
          const options = {upsert:true};
          const updateDoc = {$set: user};
          const result = await usersCollection.updateOne(filter,updateDoc,options);
          res.json(result);
        })
        app.put('/users/admin',verifyToken, async(req,res)=>{
          const user = req.body;
          const requester = req.decodedEmail;
          if(requester){
            const requesterAccount = await usersCollection.findOne({email:requester});
            if(requesterAccount.role === 'admin'){
            const filter = {email:user.email};
            const updateDoc = {$set:{role:'admin'}};
            const result = await usersCollection.updateOne(filter,updateDoc);
            res.json(result); // we didnt used the upsert(*)
            console.log('all ok ');
            }
          } 
          else{
            res.status(403).json({message:'Hi its,Fahad. what you thought? I made this site secure'});
          }
        })
        
    }finally{
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello from doctors portal!')
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})


  // app.get('/users');//users: get //all user get
        // app.get('/users/:id');//users: get //1 get aacording to id
        // app.put('/users/:id');//users: get //update user 1 aacording to id
        // app.post('/users');//users: post // create user