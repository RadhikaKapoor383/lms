"use client";

import Loader from "@/components/Loader";
import { useGetAllOrdersAdminQuery } from "@/redux/features/orders/ordersApi";

export default function AdminOrdersPage() {
  const { data, isLoading } = useGetAllOrdersAdminQuery(undefined);
  const orders = data?.orders || [];

  return (
    <div>
      <h1 className="font-display text-3xl text-ink dark:text-parchment">Orders</h1>

      {isLoading && <Loader />}

      {!isLoading && orders.length === 0 && (
        <p className="mt-6 text-ink/60 dark:text-parchment/60">No orders yet.</p>
      )}

      <div className="mt-8 divide-y divide-parchment-dark dark:divide-ink-light">
        {orders.map((order: any) => (
          <div key={order._id} className="py-4 text-sm">
            <p className="text-ink dark:text-parchment">Order ID: {order._id}</p>
            <p className="mt-1 text-ink/60 dark:text-parchment/60">
              Course: {order.courseId} · User: {order.userId}
            </p>
            <p className="mt-1 text-ink/40 dark:text-parchment/40">
              {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}