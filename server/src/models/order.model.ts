import mongoose, { Document, Model, Schema } from "mongoose";

// An Order is the payment record for a paid course. Money lives here;
// access to the course lives in the Enrollment model.
export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export interface IOrder extends Document {
  courseId: string;
  userId: string;
  payment_info?: object; // legacy field, no longer trusted or filled from the client
  amount?: number;
  currency?: string;
  status: PaymentStatus;
  provider?: string; // "simulated" until a real gateway is added
  transactionId?: string;
  enrollment?: mongoose.Types.ObjectId;
}

const orderSchema = new Schema<IOrder>(
  {
    courseId: { type: String, required: true },
    userId: { type: String, required: true },
    payment_info: { type: Object },
    amount: { type: Number },
    currency: { type: String, default: "usd" },
    // Orders created before this field existed were all successful purchases
    status: { type: String, enum: PAYMENT_STATUSES, default: "paid" },
    provider: { type: String },
    transactionId: { type: String },
    enrollment: { type: Schema.Types.ObjectId, ref: "Enrollment" },
  },
  { timestamps: true }
);

const OrderModel: Model<IOrder> = mongoose.model("Order", orderSchema);
export default OrderModel;
