import { apiSlice } from "../api/apiSlice";

export const discussionsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCourseDiscussions: builder.query({
      query: (courseId: string) => ({
        url: `courses/${courseId}/discussions`,
        method: "GET",
        credentials: "include",
      }),
      providesTags: ["Discussions"],
    }),

    getDiscussion: builder.query({
      query: (discussionId: string) => ({
        url: `discussions/${discussionId}`,
        method: "GET",
        credentials: "include",
      }),
      providesTags: ["Discussions"],
    }),

    createDiscussion: builder.mutation({
      query: ({ courseId, title, body }: { courseId: string; title: string; body: string }) => ({
        url: `courses/${courseId}/discussions`,
        method: "POST",
        body: { title, body },
        credentials: "include",
      }),
      invalidatesTags: ["Discussions"],
    }),

    addDiscussionReply: builder.mutation({
      query: ({ discussionId, body }: { discussionId: string; body: string }) => ({
        url: `discussions/${discussionId}/replies`,
        method: "POST",
        body: { body },
        credentials: "include",
      }),
      invalidatesTags: ["Discussions"],
    }),

    setDiscussionPinned: builder.mutation({
      query: ({ discussionId, pinned }: { discussionId: string; pinned: boolean }) => ({
        url: `discussions/${discussionId}/pin`,
        method: "PUT",
        body: { pinned },
        credentials: "include",
      }),
      invalidatesTags: ["Discussions"],
    }),

    deleteDiscussion: builder.mutation({
      query: (discussionId: string) => ({
        url: `discussions/${discussionId}`,
        method: "DELETE",
        credentials: "include",
      }),
      invalidatesTags: ["Discussions"],
    }),

    deleteDiscussionReply: builder.mutation({
      query: ({ discussionId, replyId }: { discussionId: string; replyId: string }) => ({
        url: `discussions/${discussionId}/replies/${replyId}`,
        method: "DELETE",
        credentials: "include",
      }),
      invalidatesTags: ["Discussions"],
    }),

    getInstructorDiscussions: builder.query({
      query: () => ({
        url: "instructor/discussions",
        method: "GET",
        credentials: "include",
      }),
      providesTags: ["Discussions"],
    }),
  }),
});

export const {
  useGetCourseDiscussionsQuery,
  useGetDiscussionQuery,
  useCreateDiscussionMutation,
  useAddDiscussionReplyMutation,
  useSetDiscussionPinnedMutation,
  useDeleteDiscussionMutation,
  useDeleteDiscussionReplyMutation,
  useGetInstructorDiscussionsQuery,
} = discussionsApi;
