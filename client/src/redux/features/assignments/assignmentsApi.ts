import { apiSlice } from "../api/apiSlice";

export const assignmentsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ---- Shared (role-aware on the server) ----

    getCourseAssignments: builder.query({
      query: (courseId: string) => ({
        url: `courses/${courseId}/assignments`,
        method: "GET",
        credentials: "include",
      }),
      providesTags: ["Assignments"],
    }),

    // ---- Instructor / admin ----

    createAssignment: builder.mutation({
      query: ({ courseId, data }: { courseId: string; data: any }) => ({
        url: `courses/${courseId}/assignments`,
        method: "POST",
        body: data,
        credentials: "include",
      }),
      invalidatesTags: ["Assignments"],
    }),

    editAssignment: builder.mutation({
      query: ({ id, data }: { id: string; data: any }) => ({
        url: `assignments/${id}`,
        method: "PUT",
        body: data,
        credentials: "include",
      }),
      invalidatesTags: ["Assignments"],
    }),

    deleteAssignment: builder.mutation({
      query: (id: string) => ({
        url: `assignments/${id}`,
        method: "DELETE",
        credentials: "include",
      }),
      invalidatesTags: ["Assignments"],
    }),

    getAssignmentSubmissions: builder.query({
      query: (assignmentId: string) => ({
        url: `assignments/${assignmentId}/submissions`,
        method: "GET",
        credentials: "include",
      }),
      providesTags: ["Assignments"],
    }),

    gradeSubmission: builder.mutation({
      query: ({
        assignmentId,
        studentId,
        marks,
        feedback,
      }: {
        assignmentId: string;
        studentId: string;
        marks: number;
        feedback?: string;
      }) => ({
        url: `assignments/${assignmentId}/submissions/${studentId}/grade`,
        method: "PUT",
        body: { marks, feedback },
        credentials: "include",
      }),
      invalidatesTags: ["Assignments"],
    }),

    // ---- Student ----

    submitAssignment: builder.mutation({
      query: ({
        assignmentId,
        submissionText,
        fileUrl,
      }: {
        assignmentId: string;
        submissionText?: string;
        fileUrl?: string;
      }) => ({
        url: `assignments/${assignmentId}/submit`,
        method: "POST",
        body: { submissionText, fileUrl },
        credentials: "include",
      }),
      invalidatesTags: ["Assignments"],
    }),

    getMyAssignments: builder.query({
      query: () => ({
        url: "my-assignments",
        method: "GET",
        credentials: "include",
      }),
      providesTags: ["Assignments"],
    }),
  }),
});

export const {
  useGetCourseAssignmentsQuery,
  useCreateAssignmentMutation,
  useEditAssignmentMutation,
  useDeleteAssignmentMutation,
  useGetAssignmentSubmissionsQuery,
  useGradeSubmissionMutation,
  useSubmitAssignmentMutation,
  useGetMyAssignmentsQuery,
} = assignmentsApi;
