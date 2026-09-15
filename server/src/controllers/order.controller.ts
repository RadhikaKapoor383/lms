import { Request, Response, NextFunction } from "express";
import path from "path";
import ejs from "ejs";

import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import OrderModel, { IOrder } from "../models/order.model";
import userModel from "../models/user.model";
import CourseModel from "../models/course.model";
import NotificationModel from "../models/notification.model";
import sendMail from "../utils/sendMail";

export const createOrder = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId, payment_info } = req.body as IOrder;

      const user = await userModel.findById(req.user?._id);

      const courseExistInUser = user?.courses.some(
        (course: any) => course.courseId.toString() === courseId
      );

      if (courseExistInUser) {
        return next(
          new ErrorHandler("You have already purchased this course", 400)
        );
      }

      const course = await CourseModel.findById(courseId);
      if (!course) {
        return next(new ErrorHandler("Course not found", 404));
      }

      const data: any = {
        courseId: course._id,
        userId: user?._id,
        payment_info,
      };

      const order = await OrderModel.create(data);

      const mailData = {
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
      };

      if (user) {
        try {
          await sendMail({
            email: user.email,
            subject: "Order Confirmation",
            template: "order-confirmation.ejs",
            data: mailData,
          });
        } catch (error: any) {
          return next(new ErrorHandler(error.message, 500));
        }
      }

      user?.courses.push({ courseId: String(course._id) });
      await user?.save();

      await NotificationModel.create({
        userId: user?._id,
        title: "New order",
        message: `You have a new order for ${course.name}`,
      });

      if (course.purchased !== undefined) {
        course.purchased += 1;
      }
      await course.save();

      res.status(201).json({ success: true, order });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
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
