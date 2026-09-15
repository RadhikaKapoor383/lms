import { apiSlice } from "../api/apiSlice";

export const layoutApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getLayoutByType: builder.query({
      query: (type: string) => ({
        url: "get-layout",
        method: "POST",
        body: { type },
      }),
    }),
  }),
});

export const { useGetLayoutByTypeQuery } = layoutApi;
