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

    // ---- Course announcements ----

    getCourseAnnouncements: builder.query({
      query: (courseId: string) => ({
        url: `courses/${courseId}/announcements`,
        method: "GET",
        credentials: "include",
      }),
      providesTags: ["Announcements"] as any,
    }),

    createCourseAnnouncement: builder.mutation({
      query: ({ courseId, title, message }: { courseId: string; title: string; message: string }) => ({
        url: `courses/${courseId}/announcements`,
        method: "POST",
        body: { title, message },
        credentials: "include",
      }),
      invalidatesTags: ["Announcements"] as any,
    }),

    deleteCourseAnnouncement: builder.mutation({
      query: ({ courseId, announcementId }: { courseId: string; announcementId: string }) => ({
        url: `courses/${courseId}/announcements/${announcementId}`,
        method: "DELETE",
        credentials: "include",
      }),
      invalidatesTags: ["Announcements"] as any,
    }),

    // platform-wide + the courses I'm learning in (student dashboard)
    getMyAnnouncements: builder.query({
      query: () => ({
        url: "my-announcements",
        method: "GET",
        credentials: "include",
      }),
      providesTags: ["Announcements"] as any,
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
  useGetCourseAnnouncementsQuery,
  useCreateCourseAnnouncementMutation,
  useDeleteCourseAnnouncementMutation,
  useGetMyAnnouncementsQuery,
} = announcementsApi;