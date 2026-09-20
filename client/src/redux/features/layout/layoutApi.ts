import { apiSlice } from "../api/apiSlice";

export const layoutApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getLayoutByType: builder.query({
      query: (type: string) => ({
        url: "get-layout",
        method: "POST",
        body: { type },
      }),
      providesTags: ["Layout"] as any,
    }),

    createLayout: builder.mutation({
      query: (data) => ({
        url: "create-layout",
        method: "POST",
        body: data,
        credentials: "include",
      }),
      invalidatesTags: ["Layout"] as any,
    }),

    editLayout: builder.mutation({
      query: (data) => ({
        url: "edit-layout",
        method: "PUT",
        body: data,
        credentials: "include",
      }),
      invalidatesTags: ["Layout"] as any,
    }),
  }),
});

export const {
  useGetLayoutByTypeQuery,
  useCreateLayoutMutation,
  useEditLayoutMutation,
} = layoutApi;