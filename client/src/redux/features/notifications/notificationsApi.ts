import { apiSlice } from "../api/apiSlice";

export const notificationsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAllNotifications: builder.query({
      query: () => ({
        url: "admin/notifications",
        method: "GET",
        credentials: "include",
      }),
      providesTags: ["Notifications"],
    }),

    updateNotification: builder.mutation({
      query: (id: string) => ({
        url: `admin/update-notification/${id}`,
        method: "PUT",
        credentials: "include",
      }),
      invalidatesTags: ["Notifications"],
    }),
  }),
});

export const { useGetAllNotificationsQuery, useUpdateNotificationMutation } =
  notificationsApi;