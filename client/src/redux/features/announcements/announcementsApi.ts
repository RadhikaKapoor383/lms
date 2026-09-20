import { apiSlice } from "../api/apiSlice";

export const announcementsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAnnouncements: builder.query({
      query: () => ({
        url: "announcements",
        method: "GET",
      }),
      providesTags: ["Announcements"] as any,
    }),

    createAnnouncement: builder.mutation({
      query: ({ title, message }) => ({
        url: "admin/create-announcement",
        method: "POST",
        body: { title, message },
        credentials: "include",
      }),
      invalidatesTags: ["Announcements"] as any,
    }),

    deleteAnnouncement: builder.mutation({
      query: (id: string) => ({
        url: `admin/announcement/${id}`,
        method: "DELETE",
        credentials: "include",
      }),
      invalidatesTags: ["Announcements"] as any,
    }),
  }),
});

export const {
  useGetAnnouncementsQuery,
  useCreateAnnouncementMutation,
  useDeleteAnnouncementMutation,
} = announcementsApi;