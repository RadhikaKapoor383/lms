import { apiSlice } from "../api/apiSlice";

export const videosApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // instructor/admin: a one-time signature to send the file to storage
    startVideoUpload: builder.mutation({
      query: ({ courseId, lessonId }: { courseId: string; lessonId: string }) => ({
        url: `courses/${courseId}/lessons/${lessonId}/video-upload`,
        method: "POST",
        credentials: "include",
      }),
    }),
    // ...then attach the finished upload to the lesson
    attachUploadedVideo: builder.mutation({
      query: ({ courseId, lessonId, publicId }: { courseId: string; lessonId: string; publicId: string }) => ({
        url: `courses/${courseId}/lessons/${lessonId}/video`,
        method: "PUT",
        body: { publicId },
        credentials: "include",
      }),
      invalidatesTags: ["Courses"],
    }),
    removeUploadedVideo: builder.mutation({
      query: ({ courseId, lessonId }: { courseId: string; lessonId: string }) => ({
        url: `courses/${courseId}/lessons/${lessonId}/video`,
        method: "DELETE",
        credentials: "include",
      }),
      invalidatesTags: ["Courses"],
    }),
    // anyone who may see the course: a short-lived link to watch
    getVideoLink: builder.query({
      query: ({ courseId, lessonId }: { courseId: string; lessonId: string }) => ({
        url: `courses/${courseId}/lessons/${lessonId}/video-link`,
        method: "GET",
        credentials: "include",
      }),
      keepUnusedDataFor: 0, // a link expires: always ask for a fresh one
    }),
  }),
});

export const {
  useStartVideoUploadMutation,
  useAttachUploadedVideoMutation,
  useRemoveUploadedVideoMutation,
  useGetVideoLinkQuery,
} = videosApi;
