import { apiSlice } from "../api/apiSlice";

export const adminApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getInstructors: builder.query({
      query: () => ({ url: "admin/instructors", method: "GET", credentials: "include" }),
      providesTags: ["Instructors"],
    }),

    getInstructorDetail: builder.query({
      query: (id: string) => ({ url: `admin/instructors/${id}`, method: "GET", credentials: "include" }),
      providesTags: ["Instructors"],
    }),

    assignCourseInstructor: builder.mutation({
      query: ({ courseId, instructorId }: { courseId: string; instructorId: string }) => ({
        url: `admin/courses/${courseId}/instructor`,
        method: "PUT",
        body: { instructorId },
        credentials: "include",
      }),
      invalidatesTags: ["Courses", "Instructors"],
    }),

    // "Courses" so approving or rejecting (which invalidates it) refreshes the queue
    getCourseApprovals: builder.query({
      query: () => ({ url: "admin/course-approvals", method: "GET", credentials: "include" }),
      providesTags: ["Courses"],
    }),

    getSettings: builder.query({
      query: () => ({ url: "admin/settings", method: "GET", credentials: "include" }),
      providesTags: ["Settings"],
    }),

    updateSettings: builder.mutation({
      query: (changes: Record<string, unknown>) => ({
        url: "admin/settings",
        method: "PUT",
        body: changes,
        credentials: "include",
      }),
      invalidatesTags: ["Settings"],
    }),

    getReports: builder.query({
      query: (status: string) => ({
        url: `admin/reports?status=${encodeURIComponent(status)}`,
        method: "GET",
        credentials: "include",
      }),
      providesTags: ["Reports"],
    }),

    resolveReport: builder.mutation({
      query: ({ id, status, note }: { id: string; status: "resolved" | "dismissed"; note?: string }) => ({
        url: `admin/reports/${id}`,
        method: "PUT",
        body: { status, note },
        credentials: "include",
      }),
      invalidatesTags: ["Reports"],
    }),

    // any logged-in user who can read the course's discussions
    reportDiscussionContent: builder.mutation({
      query: ({
        discussionId,
        replyId,
        reason,
        details,
      }: {
        discussionId: string;
        replyId?: string;
        reason: string;
        details?: string;
      }) => ({
        url: `discussions/${discussionId}/report`,
        method: "POST",
        body: { replyId, reason, details },
        credentials: "include",
      }),
    }),
  }),
});

export const {
  useGetInstructorsQuery,
  useGetInstructorDetailQuery,
  useAssignCourseInstructorMutation,
  useGetCourseApprovalsQuery,
  useGetSettingsQuery,
  useUpdateSettingsMutation,
  useGetReportsQuery,
  useResolveReportMutation,
  useReportDiscussionContentMutation,
} = adminApi;
