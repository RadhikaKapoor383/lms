import { apiSlice } from "../api/apiSlice";

export const enrollmentApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ---- Student ----

    enrollInFreeCourse: builder.mutation({
      query: (courseId: string) => ({
        url: "enroll",
        method: "POST",
        body: { courseId },
        credentials: "include",
      }),
      invalidatesTags: ["Courses", "User", "Enrollments"],
    }),

    enrollWithCode: builder.mutation({
      query: ({ courseId, code }: { courseId: string; code: string }) => ({
        url: "enroll-with-code",
        method: "POST",
        body: { courseId, code },
        credentials: "include",
      }),
      invalidatesTags: ["Courses", "User", "Enrollments"],
    }),

    getMyEnrollments: builder.query({
      query: () => ({
        url: "my-enrollments",
        method: "GET",
        credentials: "include",
      }),
      providesTags: ["Enrollments"],
    }),

    getCourseProgress: builder.query({
      query: (courseId: string) => ({
        url: `progress/${courseId}`,
        method: "GET",
        credentials: "include",
      }),
      providesTags: ["Enrollments"],
    }),

    updateLessonProgress: builder.mutation({
      query: ({
        courseId,
        lessonId,
        completed = true,
      }: {
        courseId: string;
        lessonId: string;
        completed?: boolean;
      }) => ({
        url: `progress/${courseId}/lessons/${lessonId}`,
        method: "PUT",
        body: { completed },
        credentials: "include",
      }),
      invalidatesTags: ["Enrollments", "Certificates"],
    }),

    // ---- Instructor / admin: students of one course ----

    getCourseStudents: builder.query({
      query: (courseId: string) => ({
        url: `instructor/courses/${courseId}/students`,
        method: "GET",
        credentials: "include",
      }),
      providesTags: ["Enrollments"],
    }),

    enrollStudentByInstructor: builder.mutation({
      query: ({ courseId, email }: { courseId: string; email: string }) => ({
        url: `instructor/courses/${courseId}/enroll`,
        method: "POST",
        body: { email },
        credentials: "include",
      }),
      invalidatesTags: ["Enrollments", "Courses"],
    }),

    unenrollStudent: builder.mutation({
      query: ({ courseId, studentId }: { courseId: string; studentId: string }) => ({
        url: `instructor/courses/${courseId}/students/${studentId}`,
        method: "DELETE",
        credentials: "include",
      }),
      invalidatesTags: ["Enrollments", "Courses"],
    }),

    // ---- Admin: every enrollment ----

    getAllEnrollmentsAdmin: builder.query({
      query: () => ({
        url: "admin/enrollments",
        method: "GET",
        credentials: "include",
      }),
      providesTags: ["Enrollments"],
    }),
  }),
});

export const {
  useEnrollInFreeCourseMutation,
  useEnrollWithCodeMutation,
  useGetMyEnrollmentsQuery,
  useGetCourseProgressQuery,
  useUpdateLessonProgressMutation,
  useGetCourseStudentsQuery,
  useEnrollStudentByInstructorMutation,
  useUnenrollStudentMutation,
  useGetAllEnrollmentsAdminQuery,
} = enrollmentApi;
