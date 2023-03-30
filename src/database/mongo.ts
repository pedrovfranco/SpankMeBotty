import mongoose from 'mongoose';
import * as redis from 'redis';

//#region Redis Logic
const timeToKeepInRedis = 60 * 60; // 1 hour
const redisClient = redis.createClient(
{
  url: 'redis://127.0.0.1:6379',
  // pingInterval: 1000
});

redisClient.connect();

declare module 'mongoose' {
  interface DocumentQuery<
      T,
      DocType extends mongoose.Document,
      QueryHelpers = {}
  > {
      mongooseCollection: {
          name: any;
      };
      cache(): Query<T[], Document> & QueryHelpers;
      useCache: boolean;
      hashKey: string;
  }
  
  interface Query<ResultType, DocType, THelpers = {}, RawDocType = DocType>
      extends DocumentQuery<any, any> {}
}

mongoose.Query.prototype.cache = function (options: any = {}) {
  this.useCache = true;
  this.hashKey = JSON.stringify(options.key || this.mongooseCollection.name);

  // To make it chain-able with the queries
  // Ex: Blog
  // .find()
  // .cache()
  // .limit(10)
  return this;
};

export function clearCache(hashKey: string) {
  let str = JSON.stringify(hashKey);
  console.log(str);

  redisClient.del(str);
};


// const exec = mongoose.Query.prototype.exec;

// mongoose.Query.prototype.exec = async function () {
//   if (!this.useCache) {
//       //NO CACHE
//       return exec.apply(this);
//   }

//   const key = JSON.stringify({
//     ...this.getQuery(),
//     collection: this.model.collection.name,
//   });

//   const cacheValue = await redisClient.hGet(this.hashKey, key);

//   if (cacheValue) {
//     console.log("DATA FROM CACHE");
//     const doc = JSON.parse(cacheValue);
//     console.log("PARSED DATA FROM CACHE");

//     //convert plain object to mongoose object
//     return Array.isArray(doc)
//       ? doc.map((d) => new this.model(d))
//       : new this.model(doc);
//   }

//   const result = await exec.apply(this);

//   redisClient.hSet(this.hashKey, key, JSON.stringify(result));
//   redisClient.expire(this.hashKey, timeToKeepInRedis);
//   return result;
// };



//#endregion

//#region Mongoose Logic

const dbName = 'spank-me-botty'
// let url = (process.env.NODE_ENV === 'production') ? `${process.env.DATABASE_URL}${dbName}?retryWrites=true&w=majority` : `mongodb://localhost:27017/${dbName}`;
let url = `${process.env.DATABASE_URL}${dbName}?retryWrites=true&w=majority`;

console.log("MongoDB URL: " + url);

mongoose.set('strictQuery', true);

mongoose.connect(url, { 
  serverSelectionTimeoutMS: 5000,
});


let db = mongoose.connection;

db.once('open', () => console.log('Connected to the database'));

// checks if connection with the database is successful
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

//#endregion

