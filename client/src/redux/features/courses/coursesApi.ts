import { apiSlice } from "../api/apiSlice";

export const coursesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAllCourses: builder.query({
      query: () => ({
        url: "get-courses",
        method: "GET",
      }),
      providesTags: ["Courses"],
    }),

    getCourseDetails: builder.query({
      query: (id: string) => ({
        url: `get-course/${id}`,
        method: "GET",
      }),
      providesTags: ["Courses"],
    }),

    getCourseContent: builder.query({
      query: (id: string) => ({
        url: `get-course-content/${id}`,
        method: "GET",
        credentials: "include",
      }),
      providesTags: ["Courses"],
    }),

    // Full course + lessons (with each lesson's _id) for the edit form.
    // Separate from getAdminAllCourses/getInstructorCourses because those are
    // list views and shouldn't have to fetch every course's lesson content
    // just so one of them might get opened for editing.
    getCourseForEdit: builder.query({
      query: (id: string) => ({
        url: `edit-course/${id}`,
        method: "GET",
        credentials: "include",
      }),
      providesTags: ["Courses"],
    }),

    addQuestion: builder.mutation({
      query: ({ question, courseId, contentId }) => ({
        url: "add-question",
        method: "PUT",
        body: { question, courseId, contentId },
        credentials: "include",
      }),
      invalidatesTags: ["Courses"],
    }),

    // ---- Admin endpoints ----

    getAdminAllCourses: builder.query({
      query: (status?: string) => ({
        url: status ? `admin/courses?status=${encodeURIComponent(status)}` : "admin/courses",
        method: "GET",
        credentials: "include",
      }),
      providesTags: ["Courses"],
    }),

    // ---- Instructor endpoints ----

    getInstructorCourses: builder.query({
      query: () => ({
        url: "instructor/courses",
        method: "GET",
        credentials: "include",
      }),
      providesTags: ["Courses"],
    }),

    updateCourseStatus: builder.mutation({
      query: ({ id, status, reason }: { id: string; status: string; reason?: string }) => ({
        url: `admin/course-status/${id}`,
        method: "PUT",
        body: { status, reason },
        credentials: "include",
      }),
      invalidatesTags: ["Courses"],
    }),

    // public search with filters; params are only the ones the user actually set
    searchCourses: builder.query({
      query: (params: Record<string, string>) => ({
        url: `courses/search?${new URLSearchParams(params).toString()}`,
        method: "GET",
      }),
    }),

    getCourseFilters: builder.query({
      query: () => ({ url: "courses/filters", method: "GET" }),
    }),

    submitCourseForApproval: builder.mutation({
      query: (id: string) => ({
        url: `courses/${id}/submit-for-approval`,
        method: "PUT",
        credentials: "include",
      }),
      invalidatesTags: ["Courses"],
    }),

    withdrawCourseSubmission: builder.mutation({
      query: (id: string) => ({
        url: `courses/${id}/withdraw-submission`,
        method: "PUT",
        credentials: "include",
      }),
      invalidatesTags: ["Courses"],
    }),

    createCourse: builder.mutation({
      query: (data) => ({
        url: "create-course",
        method: "POST",
        body: data,
        credentials: "include",
      }),
      invalidatesTags: ["Courses"],
    }),

    editCourse: builder.mutation({
      query: ({ id, data }) => ({
        url: `edit-course/${id}`,
        method: "PUT",
        body: data,
        credentials: "include",
      }),
      invalidatesTags: ["Courses"],
    }),

    deleteCourseAdmin: builder.mutation({
      query: (id: string) => ({
        url: `delete-course/${id}`,
        method: "DELETE",
        credentials: "include",
      }),
      invalidatesTags: ["Courses"],
    }),
  }),
});

export const {
  useGetAllCoursesQuery,
  useGetCourseDetailsQuery,
  useGetCourseContentQuery,
  useGetCourseForEditQuery,
  useAddQuestionMutation,
  useGetAdminAllCoursesQuery,
  useGetInstructorCoursesQuery,
  useCreateCourseMutation,
  useEditCourseMutation,
  useDeleteCourseAdminMutation,
  useUpdateCourseStatusMutation,
  useSearchCoursesQuery,
  useGetCourseFiltersQuery,
  useSubmitCourseForApprovalMutation,
  useWithdrawCourseSubmissionMutation,
} = coursesApi;