import { apiSlice } from "../api/apiSlice";

export const usersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAllUsersAdmin: builder.query({
      query: () => ({
        url: "admin/users",
        method: "GET",
        credentials: "include",
      }),
      providesTags: ["User"],
    }),

    updateUserRole: builder.mutation({
      query: ({ id, role }) => ({
        url: "admin/update-user-role",
        method: "PUT",
        body: { id, role },
        credentials: "include",
      }),
      invalidatesTags: ["User"],
    }),

    deleteUserAdmin: builder.mutation({
      query: (id: string) => ({
        url: `admin/user/${id}`,
        method: "DELETE",
        credentials: "include",
      }),
      invalidatesTags: ["User"],
    }),
  }),
});

export const {
  useGetAllUsersAdminQuery,
  useUpdateUserRoleMutation,
  useDeleteUserAdminMutation,
} = usersApi;