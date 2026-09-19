import { apiSlice } from "../api/apiSlice";

export const ordersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createOrder: builder.mutation({
      query: ({ courseId, payment_info }) => ({
        url: "create-order",
        method: "POST",
        body: { courseId, payment_info },
        credentials: "include",
      }),
      invalidatesTags: ["Courses", "User"],
    }),

    getAllOrdersAdmin: builder.query({
      query: () => ({
        url: "admin/orders",
        method: "GET",
        credentials: "include",
      }),
      providesTags: ["Orders"],
    }),
  }),
});

export const { useCreateOrderMutation, useGetAllOrdersAdminQuery } = ordersApi;