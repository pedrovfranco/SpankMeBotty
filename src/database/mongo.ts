import mongoose from 'mongoose';


export let connected = false;

export async function connect() {
  const dbName = 'spank-me-botty'
  // let url = (process.env.NODE_ENV === 'production') ? `${process.env.DATABASE_URL}${dbName}?retryWrites=true&w=majority` : `mongodb://localhost:27017/${dbName}`;
  let url = `${process.env.DATABASE_URL}${dbName}?retryWrites=true&w=majority`;
  
  console.log("MongoDB URL: " + url);
  
  mongoose.set('strictQuery', true);
  
  try {
    await mongoose.connect(url, { 
      serverSelectionTimeoutMS: 5000,
    });
    console.log('Connected to the database');
    connected = true;
  } catch (error) {
    console.error('Failed to connect to the database:', error);
    connected = false;
  }  
}
 
