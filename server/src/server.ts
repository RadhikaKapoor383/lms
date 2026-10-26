import http from "http";
import { app } from "./app";
import { startSocketServer } from "./socketServer";
import connectDB from "./utils/db";
import dotenv from "dotenv";
import cloudinary from "cloudinary";
dotenv.config();

// Cloudinary config
cloudinary.v2.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_SECRET_KEY,
});

// one HTTP server for the API and the Socket.io connections
const server = http.createServer(app);
startSocketServer(server);

server.listen(process.env.PORT, () => {
  console.log(`Server is connected with port ${process.env.PORT}`);
  connectDB();
});
