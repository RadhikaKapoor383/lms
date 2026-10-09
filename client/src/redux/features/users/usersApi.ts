import { apiSlice } from "../api/apiSlice";
import { userLoggedIn } from "../auth/authSlice";

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

    // deactivating signs the person out everywhere and blocks login; nothing is deleted
    setUserActive: builder.mutation({
      query: ({ id, active }: { id: string; active: boolean }) => ({
        url: `admin/users/${id}/status`,
        method: "PUT",
        body: { active },
        credentials: "include",
      }),
      invalidatesTags: ["User", "Instructors"],
    }),

    // The logged-in person editing their own name / bio / expertise.
    // On success the user stored in redux is replaced, so the page updates.
    updateProfile: builder.mutation({
      query: (body: { name?: string; bio?: string; expertise?: string[] }) => ({
        url: "update-user-info",
        method: "PUT",
        body,
        credentials: "include",
      }),
      async onQueryStarted(_arg, { queryFulfilled, dispatch, getState }) {
        try {
          const { data } = await queryFulfilled;
          const token = (getState() as any).auth.token;
          dispatch(userLoggedIn({ accessToken: token, user: data.user }));
        } catch {
          /* the page shows the error */
        }
      },
    }),

    // only for students waiting for approval (when the platform requires it)
    setUserApproval: builder.mutation({
      query: ({ id, approve }: { id: string; approve: boolean }) => ({
        url: `admin/users/${id}/approval`,
        method: "PUT",
        body: { approve },
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
  useSetUserActiveMutation,
  useSetUserApprovalMutation,
  useUpdateProfileMutation,
  useDeleteUserAdminMutation,
} = usersApi;