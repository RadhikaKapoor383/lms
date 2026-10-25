import { apiSlice } from "../api/apiSlice";

export const departmentsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // [{ _id, name, courseCount, instructorCount }]
    getDepartments: builder.query({
      query: () => ({
        url: "departments",
        method: "GET",
        credentials: "include",
      }),
      providesTags: ["Departments"],
    }),

    createDepartment: builder.mutation({
      query: (name: string) => ({
        url: "admin/departments",
        method: "POST",
        body: { name },
        credentials: "include",
      }),
      invalidatesTags: ["Departments"],
    }),

    // a rename shows up on course pages and lists, so those are refetched too
    updateDepartment: builder.mutation({
      query: ({ id, name }: { id: string; name: string }) => ({
        url: `admin/departments/${id}`,
        method: "PUT",
        body: { name },
        credentials: "include",
      }),
      invalidatesTags: ["Departments", "Courses", "Instructors"],
    }),

    deleteDepartment: builder.mutation({
      query: (id: string) => ({
        url: `admin/departments/${id}`,
        method: "DELETE",
        credentials: "include",
      }),
      invalidatesTags: ["Departments"],
    }),

    // departmentId "" takes the instructor out of their department
    setInstructorDepartment: builder.mutation({
      query: ({ instructorId, departmentId }: { instructorId: string; departmentId: string }) => ({
        url: `admin/instructors/${instructorId}/department`,
        method: "PUT",
        body: { departmentId: departmentId || null },
        credentials: "include",
      }),
      invalidatesTags: ["Instructors", "Departments"],
    }),
  }),
});

export const {
  useGetDepartmentsQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
  useSetInstructorDepartmentMutation,
} = departmentsApi;
