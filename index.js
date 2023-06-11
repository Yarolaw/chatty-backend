const admin = require("firebase-admin");
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { v4: uuid } = require("uuid");
const serviceAccount = require("./serviceAccountKey.json");
require("dotenv").config();

const app = express();

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
const usersRef = db.collection("users");

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("update_status", (userId) => {
    console.log(`Received user id: ${userId}`);

    if (userId) {
      socket.userId = userId;

      setTimeout(async () => {
        const userRef = usersRef.doc(userId);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
          console.log(`User with id ${userId} exist`);

          await userRef.update({
            online: true
          });
        } else {
          console.log(`User with id ${userId} does not exist`);
        }
      }, 1000);
    }
  });

  socket.on("join_room", (data) => {
    socket.join(data);
    console.log(`User with ID: ${socket.id} joined room: ${data}`);

    socket.on("typing", (data) => socket.broadcast.emit("typingResponse", data));
  });

  socket.on("send_message", (data) => {
    const updatedData = { ...data, id: uuid() };
    console.log("updatedData", updatedData);
    socket.to(data.room).emit("receive_message", updatedData);
  });

  socket.on("disconnect", () => {
    const userId = socket.userId;
    console.log("userId in Disconnected event", userId);
    if (userId) {
      console.log(`Disconnected user id: ${userId}`);

      usersRef.doc(userId).update({
        online: false
      });
    }

    console.log("User Disconnected", socket.id);
  });
});

server.listen(3001, () => {
  console.log("SERVER RUNNING");
});
