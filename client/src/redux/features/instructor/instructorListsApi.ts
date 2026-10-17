import { apiSlice } from "../api/apiSlice";

// The instructor's "everything across all my courses" lists.
export const instructorListsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getInstructorStudents: builder.query({
      query: (params: { page?: number; limit?: number; q?: string; courseId?: string; status?: string }) => {
        const search = new URLSearchParams();
        Object.entries(params || {}).forEach(([k, v]) => {
          if (v !== undefined && v !== "") search.set(k, String(v));
        });
        return { url: `instructor/students?${search.toString()}`, method: "GET", credentials: "include" };
      },
    }),
    getInstructorAssignments: builder.query({
      query: () => ({ url: "instructor/assignments", method: "GET", credentials: "include" }),
    }),
    getInstructorQuizzes: builder.query({
      query: () => ({ url: "instructor/quizzes", method: "GET", credentials: "include" }),
    }),
  }),
});

export const {
  useGetInstructorStudentsQuery,
  useGetInstructorAssignmentsQuery,
  useGetInstructorQuizzesQuery,
} = instructorListsApi;
