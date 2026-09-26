import { apiSlice } from "../api/apiSlice";

export const categoriesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCategories: builder.query({
      query: () => ({
        url: "categories",
        method: "GET",
        credentials: "include",
      }),
      providesTags: ["Categories"],
    }),

    createCategory: builder.mutation({
      query: (name: string) => ({
        url: "admin/categories",
        method: "POST",
        body: { name },
        credentials: "include",
      }),
      invalidatesTags: ["Categories"],
    }),

    updateCategory: builder.mutation({
      query: ({ id, name }: { id: string; name: string }) => ({
        url: `admin/categories/${id}`,
        method: "PUT",
        body: { name },
        credentials: "include",
      }),
      invalidatesTags: ["Categories"],
    }),

    deleteCategory: builder.mutation({
      query: (id: string) => ({
        url: `admin/categories/${id}`,
        method: "DELETE",
        credentials: "include",
      }),
      invalidatesTags: ["Categories"],
    }),
  }),
});

export const {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} = categoriesApi;
