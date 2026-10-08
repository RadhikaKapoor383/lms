import { apiSlice } from "../api/apiSlice";

export const quizzesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCourseQuizzes: builder.query({
      query: (courseId: string) => ({
        url: `courses/${courseId}/quizzes`,
        method: "GET",
        credentials: "include",
      }),
      providesTags: ["Quizzes"],
    }),

    getQuiz: builder.query({
      query: (id: string) => ({
        url: `quizzes/${id}`,
        method: "GET",
        credentials: "include",
      }),
      providesTags: ["Quizzes"],
    }),

    createQuiz: builder.mutation({
      query: ({ courseId, data }: { courseId: string; data: any }) => ({
        url: `courses/${courseId}/quizzes`,
        method: "POST",
        body: data,
        credentials: "include",
      }),
      invalidatesTags: ["Quizzes"],
    }),

    editQuiz: builder.mutation({
      query: ({ id, data }: { id: string; data: any }) => ({
        url: `quizzes/${id}`,
        method: "PUT",
        body: data,
        credentials: "include",
      }),
      invalidatesTags: ["Quizzes"],
    }),

    deleteQuiz: builder.mutation({
      query: (id: string) => ({
        url: `quizzes/${id}`,
        method: "DELETE",
        credentials: "include",
      }),
      invalidatesTags: ["Quizzes"],
    }),

    getQuizAttempts: builder.query({
      query: (quizId: string) => ({
        url: `quizzes/${quizId}/attempts`,
        method: "GET",
        credentials: "include",
      }),
      providesTags: ["Quizzes"],
    }),

    // Asks the server to record the start time (the server owns the clock).
    startQuizAttempt: builder.mutation({
      query: (quizId: string) => ({
        url: `quizzes/${quizId}/start`,
        method: "POST",
        credentials: "include",
      }),
    }),

    submitQuizAttempt: builder.mutation({
      query: ({
        quizId,
        answers,
      }: {
        quizId: string;
        answers: { questionId: string; selectedOptionIndexes: number[] }[];
      }) => ({
        url: `quizzes/${quizId}/attempts`,
        method: "POST",
        body: { answers },
        credentials: "include",
      }),
      invalidatesTags: ["Quizzes", "Certificates"],
    }),
  }),
});

export const {
  useGetCourseQuizzesQuery,
  useGetQuizQuery,
  useCreateQuizMutation,
  useEditQuizMutation,
  useDeleteQuizMutation,
  useGetQuizAttemptsQuery,
  useStartQuizAttemptMutation,
  useSubmitQuizAttemptMutation,
} = quizzesApi;
