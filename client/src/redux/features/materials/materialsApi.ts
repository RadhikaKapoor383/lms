import { apiSlice } from "../api/apiSlice";

export const materialsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Anyone with access to the course (the server checks): metadata only.
    getCourseMaterials: builder.query({
      query: (courseId: string) => ({
        url: `courses/${courseId}/materials`,
        method: "GET",
        credentials: "include",
      }),
      providesTags: ["Materials"],
    }),

    // Instructor / admin. The body is FormData, so the browser sets the
    // multipart header (with its boundary) by itself - don't set one here.
    uploadMaterial: builder.mutation({
      query: ({ courseId, formData }: { courseId: string; formData: FormData }) => ({
        url: `courses/${courseId}/materials`,
        method: "POST",
        body: formData,
        credentials: "include",
      }),
      invalidatesTags: ["Materials"],
    }),

    deleteMaterial: builder.mutation({
      query: ({ courseId, materialId }: { courseId: string; materialId: string }) => ({
        url: `courses/${courseId}/materials/${materialId}`,
        method: "DELETE",
        credentials: "include",
      }),
      invalidatesTags: ["Materials"],
    }),
  }),
});

export const {
  useGetCourseMaterialsQuery,
  useUploadMaterialMutation,
  useDeleteMaterialMutation,
} = materialsApi;
