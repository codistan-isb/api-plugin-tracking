import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pkg = require("../package.json");
const redis = require("redis");
let redisClient;
// var host = '127.0.0.1';
var host = "localhost";
// const branchModel = require("./models/branchModel.js");
require("dotenv").config();
// let client = redis.createClient({
//   socket: {
//     host: host,
//     port: 6379,
//     connect_timeout: 5000,
//   }
// });

const io = require("socket.io")(6397, {
  cors: {
    origin: "*",
  },
  //  path:'/location'
});
//var host = '13.52.55.53';


(async () => {
  console.log(`Connecting to Redis server at ${host}`);
  redisClient = redis.createClient({
    socket: {
      host: host,
      port: 6379,
      connect_timeout: 5000,
    },
  });
  redisClient.on("error", (error) => console.error(`Error ${host} : ${error}`));
  await redisClient.connect();
})();
function trackingStartUp(context) {
  console.log("here startup");
  // client.on('error', (err) => {
  //   console.log(`Error ${err}`);
  // });
  // console.log("branchModel", branchModel);
  // console.log("client ", client);
  console.log("redisClient", redisClient);
  // io.on("connection", async (socket) => {
  //   console.log("socket", socket);
  // })
}
export default async function register(app) {
  await app.registerPlugin({
    label: pkg.label,
    name: pkg.name,
    version: pkg.version,
    functionsByType: {
      startup: [trackingStartUp]
    },
  });
}
