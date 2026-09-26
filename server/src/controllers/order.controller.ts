import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import OrderModel from "../models/order.model";
import CourseModel from "../models/course.model";
import sendMail from "../utils/sendMail";
import {
  createEnrollment,
  hasActiveEnrollment,
  isObjectId,
} from "../services/enrollment.service";

// Payments are SIMULATED for now: no money moves and no gateway is called.
// That is fine for development, but it means anyone could "buy" any paid course
// for free - so it is only switched on outside production (or when you set
// PAYMENT_MODE=simulated on purpose). To go live, replace the simulated block
// below with a real gateway and mark the order "paid" only from the gateway's
// verified webhook - never because the browser says it succeeded.
const paymentMode = () =>
  process.env.PAYMENT_MODE ||
  (process.env.NODE_ENV === "production" ? "off" : "simulated");

export const createOrder = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // NOTE: any payment_info sent by the browser is ignored on purpose.
      const { courseId } = req.body;
      const studentId = String(req.user?._id);

      if (paymentMode() !== "simulated") {
        return next(new ErrorHandler("Online payments are not enabled yet", 503));
      }

      if (!isObjectId(courseId)) {
        return next(new ErrorHandler("Invalid course id", 400));
      }

      const course = await CourseModel.findOne({
        _id: courseId,
        status: "Published",
      });
      if (!course) {
        return next(new ErrorHandler("Course not found", 404));
      }
      if (!course.price || course.price <= 0) {
        return next(new ErrorHandler("This course is free - use Enroll instead", 400));
      }
      if (course.enrollmentMode !== "open") {
        return next(new ErrorHandler("This course is not open for purchase", 403));
      }
      if (await hasActiveEnrollment(studentId, courseId)) {
        return next(new ErrorHandler("You have already purchased this course", 409));
      }

      // 1. payment record (money), 2. enrollment (access), 3. mark payment paid
      const order = await OrderModel.create({
        courseId: String(course._id),
        userId: studentId,
        amount: course.price,
        currency: "usd",
        provider: "simulated",
        status: "pending",
        transactionId: `SIM-${new mongoose.Types.ObjectId()}`,
      });

      let student;
      try {
        const result = await createEnrollment({
          studentId,
          courseId,
          method: "paid",
        });
        student = result.student;
        order.status = "paid";
        order.enrollment = result.enrollment._id as mongoose.Types.ObjectId;
        await order.save();
      } catch (error) {
        order.status = "failed";
        await order.save();
        throw error;
      }

      // The confirmation email is a nice-to-have: if it fails, the purchase still stands.
      try {
        await sendMail({
          email: student.email,
          subject: "Order Confirmation",
          template: "order-confirmation.ejs",
          data: {
            order: {
              _id: String(course._id).slice(0, 6),
              name: course.name,
              price: course.price,
              date: new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              }),
            },
          },
        });
      } catch (mailError: any) {
        console.error("Order confirmation email failed:", mailError.message);
      }

      res.status(201).json({ success: true, order });
    } catch (error: any) {
      return next(error instanceof ErrorHandler ? error : new ErrorHandler(error.message, 500));
    }
  }
);

export const getAllOrders = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orders = await OrderModel.find().sort({ createdAt: -1 });
      res.status(200).json({ success: true, orders });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
