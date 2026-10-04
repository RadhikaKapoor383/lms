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

    // ---- Personal notifications (any logged-in user) - power the header bell ----

    getMyNotifications: builder.query({
      query: () => ({
        url: "notifications",
        method: "GET",
        credentials: "include",
      }),
      providesTags: ["Notifications"],
    }),

    markNotificationRead: builder.mutation({
      query: (id: string) => ({
        url: `notifications/${id}/read`,
        method: "PUT",
        credentials: "include",
      }),
      invalidatesTags: ["Notifications"],
    }),

    markAllNotificationsRead: builder.mutation({
      query: () => ({
        url: "notifications/read-all",
        method: "PUT",
        credentials: "include",
      }),
      invalidatesTags: ["Notifications"],
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

export const {
  useGetAllNotificationsQuery,
  useUpdateNotificationMutation,
  useGetMyNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = notificationsApi;