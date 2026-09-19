"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Loader from "@/components/Loader";
import {
  useGetCoursesAnalyticsQuery,
  useGetOrdersAnalyticsQuery,
  useGetUsersAnalyticsQuery,
} from "@/redux/features/analytics/analyticsApi";
import { useGetAdminAllCoursesQuery } from "@/redux/features/courses/coursesApi";
import { useGetAllUsersAdminQuery } from "@/redux/features/users/usersApi";
import { useGetAllOrdersAdminQuery } from "@/redux/features/orders/ordersApi";

function StatCard({
  label,
  value,
  chartData,
}: {
  label: string;
  value: number | string;
  chartData?: { month: string; count: number }[];
}) {
  return (
    <div className="border border-parchment-dark p-5 dark:border-ink-light">
      <p className="text-sm uppercase tracking-wide text-ink/50 dark:text-parchment/50">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl text-ink dark:text-parchment">
        {value}
      </p>
      {chartData && chartData.length > 0 && (
        <div className="mt-4 h-24">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="month" hide />
              <YAxis hide />
              <Tooltip
                contentStyle={{ fontSize: 12, background: "#0F2E2B", border: "none" }}
                labelStyle={{ color: "#F3EFE3" }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#D9A441"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default function AdminOverviewPage() {
  const { data: userAnalytics, isLoading: usersLoading } =
    useGetUsersAnalyticsQuery(undefined);
  const { data: courseAnalytics, isLoading: coursesLoading } =
    useGetCoursesAnalyticsQuery(undefined);
  const { data: orderAnalytics, isLoading: ordersLoading } =
    useGetOrdersAnalyticsQuery(undefined);

  const { data: coursesData } = useGetAdminAllCoursesQuery(undefined);
  const { data: usersData } = useGetAllUsersAdminQuery(undefined);
  const { data: ordersData } = useGetAllOrdersAdminQuery(undefined);

  const isLoading = usersLoading || coursesLoading || ordersLoading;

  return (
    <div>
      <h1 className="font-display text-3xl text-ink dark:text-parchment">
        Overview
      </h1>
      <p className="mt-1 text-ink/70 dark:text-parchment/70">
        Last 12 periods (28-day windows), most recent on the right.
      </p>

      {isLoading ? (
        <Loader />
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Total users"
            value={usersData?.users?.length ?? "—"}
            chartData={userAnalytics?.users?.last12Months}
          />
          <StatCard
            label="Total courses"
            value={coursesData?.courses?.length ?? "—"}
            chartData={courseAnalytics?.courses?.last12Months}
          />
          <StatCard
            label="Total orders"
            value={ordersData?.orders?.length ?? "—"}
            chartData={orderAnalytics?.orders?.last12Months}
          />
        </div>
      )}
    </div>
  );
}