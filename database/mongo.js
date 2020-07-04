const mongoose = require('mongoose');
 
const dbName = 'spankMeBotty';
const url = 'mongodb://localhost:27017/' + dbName;

mongoose.connect(url, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true,
  useCreateIndex: true, 
  useFindAndModify: false,
});

let db = mongoose.connection;

db.once('open', () => console.log('Connected to the database'));

// checks if connection with the database is successful
db.on('error', console.error.bind(console, 'MongoDB connection error:'));