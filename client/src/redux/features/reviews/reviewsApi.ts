import { apiSlice } from "../api/apiSlice";

export const reviewsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getMyReview: builder.query({
      query: (courseId: string) => ({
        url: `courses/${courseId}/my-review`,
        method: "GET",
        credentials: "include",
      }),
      providesTags: ["Reviews"],
    }),

    // creates the review, or edits it if the student already left one
    addReview: builder.mutation({
      query: ({ courseId, rating, review }: { courseId: string; rating: number; review: string }) => ({
        url: `add-review/${courseId}`,
        method: "PUT",
        body: { rating, review },
        credentials: "include",
      }),
      // "Courses" too: the public course page shows the average and the list
      invalidatesTags: ["Reviews", "Courses"],
    }),

    getInstructorReviews: builder.query({
      query: () => ({
        url: "instructor/reviews",
        method: "GET",
        credentials: "include",
      }),
      providesTags: ["Reviews"],
    }),

    getAdminReviews: builder.query({
      query: () => ({
        url: "admin/reviews",
        method: "GET",
        credentials: "include",
      }),
      providesTags: ["Reviews"],
    }),

    replyToReview: builder.mutation({
      query: ({ courseId, reviewId, comment }: { courseId: string; reviewId: string; comment: string }) => ({
        url: `courses/${courseId}/reviews/${reviewId}/reply`,
        method: "PUT",
        body: { comment },
        credentials: "include",
      }),
      invalidatesTags: ["Reviews", "Courses"],
    }),

    deleteReview: builder.mutation({
      query: ({ courseId, reviewId }: { courseId: string; reviewId: string }) => ({
        url: `admin/courses/${courseId}/reviews/${reviewId}`,
        method: "DELETE",
        credentials: "include",
      }),
      invalidatesTags: ["Reviews", "Courses"],
    }),
  }),
});

export const {
  useGetMyReviewQuery,
  useAddReviewMutation,
  useGetInstructorReviewsQuery,
  useGetAdminReviewsQuery,
  useReplyToReviewMutation,
  useDeleteReviewMutation,
} = reviewsApi;
