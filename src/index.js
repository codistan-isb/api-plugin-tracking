import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pkg = require("../package.json");
const redis = require("redis");
let redisClient;
// var host = '127.0.0.1';
var host = "localhost";
// const branchModel = require("./models/branchModel.js");
require("dotenv").config();


console.log("redis ", redis);
// (async () => {
//   console.log(`Connecting to Redis server at ${host}`);
//   redisClient = redis.createClient({
//     socket: {
//       host: host,
//       port: 6379,
//       connect_timeout: 5000,
//     },
//   });

//   redisClient.on("error", (error) => console.error(`Error ${host} : ${error}`));

//   await redisClient.connect();
// })();

// console.log("redisClient", redisClient);

// (async () => {
//   console.log(`Connecting to Redis server at ${host}`);
//   redisClient = redis.createClient({
//     socket: {
//       host: host,
//       port: 6379,
//       connect_timeout: 5000,
//     },
//   });
//   redisClient.on("error", (error) => console.error(`Error ${host} : ${error}`));
//   await redisClient.connect();
// })();
function trackingStartUp(context) {
  console.log(`Connecting to Redis server at ${host}`);
  try {
    redisClient = redis.createClient({
      socket: {
        host: host,
        port: 6379,
        connect_timeout: 5000,
      }
    });
    const io = require("socket.io")(8900, {
      cors: {
        origin: "*",
      },
      //  path:'/location'
    });
    console.log("here startup");
    // client.on('error', (err) => {
    //   console.log(`Error ${err}`);
    // });
    // console.log("branchModel", branchModel);
    // console.log("client ", client);
    console.log("redisClient", redisClient);
    io.use(async (socket, next) => {
      try {
        console.log("socket.handshake.query.userId", socket.handshake.query.userId);
        socket.userId = socket.handshake.query.userId;
        socket.id = socket.handshake.query.userId;
        next();
      } catch (err) {
        console.log("error io use ", err);
      }
    });
    //var host = '13.52.55.53';
    io.on("connection", async (socket) => {
      //when ceonnect
      console.log("a user connected.", socket.id);
      const userRole = await getUserRoleById(socket.id);
      console.log("userRole ", userRole);
      if (userRole == "dispatcher") {
        onConnectDispatcherEvents(socket.id);
        onlineDispatchers.push(socket.id);
      } else if (userRole == "admin") {
        onConnectAdminEvents(socket.id);
        onlineAdmins.push(socket.id);
      }

      //take userId and socketId from user
      socket.on("addUser", (driverID) => {
        addUser(driverID, socket.id);
        console.log(driverID, socket.id);
        //io.emit("getUsers", users);
      });
      async function updatelocation(location, driverID) {
        console.log("updatelocation");
        // const updatedUser = await locationsModel.updateOne(
        //   { driverId: driverID },
        //   {
        //     $set: {
        //       location: location,
        //     }
        //   }
        // );
        var redisCreateLocationResponse = await redisClient.set(
          driverID,
          JSON.stringify(location)
        );
        console.log("redisCreateLocationResponse ", redisCreateLocationResponse);
      }
      async function createLocation(location, driverID) {
        console.log("createLocation");
        // const newlocation = await new locationsModel({
        //   location: location,
        //   driverId: driverID
        // }).save();
        var redisCreateLocationResponse = await redisClient.set(
          driverID,
          JSON.stringify(location)
        );
        console.log("redisCreateLocationResponse ", redisCreateLocationResponse);
      }

      //send and get driver location
      socket.on("sendLocation", async ({ location, driverID, orderID, orders }) => {
        try {
          console.log("sendLocation");
          console.log(location, driverID);
          location = {
            ...location,
            updatedAt: Date.now(),
          };
          //console.log("users", users)
          //console.log("drivers", drivers)
          //console.log("some ", drivers.some((user) => user.driverID == driverID))
          var reponselocation = await findLocation(driverID);
          console.log("reponselocation", reponselocation);
          // const orderInfo = await orderModel.findOne({ _id: orderID });
          // console.log("orderInfo ", orderInfo)
          if (!reponselocation) {
            createLocation(location, driverID);
          } else {
            updatelocation(location, driverID);
          }
          /*
          if(drivers.some((driver) => driver.driverID == driverID)){
            const index = drivers.findIndex((driver) => driver.driverID == driverID)
            console.log("index ",index)
              const value=drivers[index]
              drivers[index] = {
                location: location,
                driverID: driverID
              }
          }else{
            console.log("no index ")
            var driverobj={
              location: location,
              driverID: driverID
            }
            drivers.push(driverobj);
          }*/
          console.log("location driverId ", location, driverID);
          //console.log("orderInfo?.customerId ",orderInfo?.customerId)
          // var customerId = orderInfo?.customerId.toString()
          // console.log("customerId ", customerId)
          const admins = await usermodel.find({
            UserRole: { $regex: /admin/i },
            _id: { $in: onlineAdmins },
          });
          console.log("admins ", admins);
          // Emit the getLocation event to the customer and all admin users
          //var userIds = admins.map(user => user._id).concat([customerId]);
          var userIds = admins.map((user) => user._id);
          console.log("userIds ", userIds);
          //console.log(`trackorder/${orderID}`)
          console.log(" orders ", orders);
          if (orders.length > 0) {
            const collection2 = database.collection("Accounts");
            const options = {
              /* Your query options */
            };
            const query = {
              _id: driverID,
            };
            drivers = await collection2.find(query, options).toArray();
            console.log("drivers ", drivers[0]);
            const phone = drivers[0]?.profile?.phone;
            for (let i = 0; i < orders.length; i++) {
              const orderId = orders[i].OrderID.toString(); // Assuming each order ID is stored in the 'orders' array
              console.log(`trackorder/${orderId}`);
              io.emit(`trackorder/${orderId}`, {
                location: location, // Assuming 'location' is defined somewhere
                driverID: driverID, // Assuming 'driverID' is defined somewhere
                phone,
              });
            }
          } else {
            io.emit(`trackorder/${orderID}`, {
              location: location,
              driverID,
            });
          }
        } catch (err) {
          console.log(err);
          console.log("Socket  Down");
          // res.status(500).json({
          //   message: "oops something went wrong",
          //   code: "1002",
          //   success: false,
          // });
        }
      });
      //get and send certain driver location
      socket.on("userinfo", async ({ driverID, orderID }) => {
        try {
          const collection = database.collection("RiderOrder");
          var riderNotAssigned;
          var riderOrders;
          if (orderID) {
            const query = {
              OrderID: orderID,
            };
            const options = {
              /* Your query options */
            };
            riderOrders = await collection.find(query, options).toArray();
            console.log("riderOrders ", riderOrders);
            console.log(
              "driverID, ",
              driverID,
              " riderOrders[0]?.riderID ",
              riderOrders[0]?.riderID
            );
            if (!riderOrders[0]) {
              const collection2 = database.collection("Orders");
              const query = {
                _id: orderID,
              };
              orders = await collection2.find(query, options).toArray();
              console.log("orders ", orders);
              if (orders.length > 0) {
                riderNotAssigned = true;
              }
            } else {
              console.log("riderNotAssigned ", riderNotAssigned);
              riderNotAssigned = false;
            }
          }

          driverID = driverID ? driverID : riderOrders[0]?.riderID;
          console.log("driverID", driverID);
          console.log("drivers ", drivers);
          var reponselocation;
          let phone;
          //const driverinfo=drivers.filter((driver) => driver.driverID == driverID);
          if (driverID) {
            riderNotAssigned = false;
            var reponselocation = await findLocation(driverID);
            console.log("reponselocation", reponselocation);
            const collection2 = database.collection("Accounts");
            const options = {
              /* Your query options */
            };
            const query = {
              _id: driverID,
            };
            drivers = await collection2.find(query, options).toArray();
            console.log("drivers ", drivers[0]);
            phone = drivers[0]?.profile?.phone;
          }
          console.log("reponselocation", reponselocation);
          if (reponselocation) {
            console.log("reponselocation ", reponselocation);
            var location = reponselocation;
            console.log("location ", location);
            console.log("socket.id ,", socket.id);

            io.to(socket.id).emit("getuserinfo", {
              location: location,
              driverID,
              riderNotAssigned,
              phone,
            });
          } else {
            var location = null;
            console.log("location ", location);
            console.log("socket.idddddd ");
            io.to(socket.id).emit("getuserinfo", {
              location: location,
              driverID,
              riderNotAssigned,
              phone,
            });
          }
        } catch {
          console.log("Socket down ", err);
        }
      });

      socket.on("needAllDrivers", async ({ }, callback) => {
        try {
          // Get all driver IDs from the database
          console.log("calling need all drivers function ", socket.userId);
          const collection = database.collection("Accounts");
          const query = {
            UserRole: { $regex: /rider/i },
          };
          const options = {
            /* Your query options */
          };
          var drivers = await collection.find(query, options).toArray();
          //console.log("drivers ", drivers)
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          // Loop through each driver and get their location from Redis
          const locations = await Promise.all(
            drivers.map(async ({ _id, branches, currentStatus }, index) => {
              //console.log("index ", index)
              var driverID = _id.toString();
              var location = await findLocation(driverID);
              //console.log("driverID ", driverID)
              const driverInfo = drivers[index];
              //console.log("driverInfo ", driverInfo)
              var todayOrdersCount = await getRiderOrders(driverID);
              var status;
              var { orderIDs, orderIDsNew } = await getRiderOrderDetail(driverID);

              if (
                todayOrdersCount > 0 ||
                currentStatus == "active" ||
                currentStatus == "online"
              ) {
                status = "On Road";
              } else {
                status = "Inactive";
              }
              console.log("driverID, currentStatus", driverID, currentStatus);
              //console.log("ordersCount", todayOrdersCount);
              var branchInfo = null;
              //console.log("branches ", branches, "_id ", _id)
              if (branches?.length > 0) {
                //Replace with your database name
                var collection = database.collection("BranchData");
                //console.log("collection ", collection)
                //console.log("branches[0] ", branches)
                const options = {
                  /* Your query options */
                };
                const query = {
                  _id: ObjectId(branches[0]),
                };
                const branch = await collection.find(query, options).toArray();
                //console.log("branch ", branch)
                branchInfo = branch[0];
              }
              if (!branchInfo) {
                branchInfo = null;
              }
              return {
                driverId: _id,
                location,
                status,
                driverInfo,
                branchInfo,
                branches,
                RiderOrderID: orderIDs,
                RiderOrderIDNew: orderIDsNew,
              };
            })
          );
          //console.log("locations ", locations)
          // Send the response back to the client using the callback function
          callback(locations);
          // io.to(socket.id).emit("getAllDrivers", {
          //   locations
          // })
        } catch (err) {
          console.log("Socket down ", err);
        }
      });

      //when disconnect
      socket.on("disconnect", async () => {
        console.log("a user disconnected!");
        removeUser(socket.id);
        const userRole = await getUserRoleById(socket.id);
        console.log("userRole ", userRole);
        if (userRole == "dispatcher") {
          const index = onlineDispatchers.indexOf(socket.id);
          if (index !== -1) {
            onlineDispatchers.splice(index, 1);
          }
        } else if (userRole == "admin") {
          const index = onlineAdmins.indexOf(socket.id);
          if (index !== -1) {
            onlineAdmins.splice(index, 1);
          }
        }

        io.emit("getUsers", users);
      });
    });
  } catch (error) {
    console.log("error", error);
  }


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
