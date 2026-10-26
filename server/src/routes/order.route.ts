import express from "express";
import { authorizeRoles, isAuthenticated, requirePermission } from "../middleware/auth";
import { createOrder, getAllOrders } from "../controllers/order.controller";

const orderRouter = express.Router();

orderRouter.post(
  "/create-order",
  isAuthenticated,
  requirePermission("enroll.self"),
  authorizeRoles("student"),
  createOrder
);
orderRouter.get(
  "/admin/orders",
  isAuthenticated,
  authorizeRoles("admin"),
  getAllOrders
);

export default orderRouter;
