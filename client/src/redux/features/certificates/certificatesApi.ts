import { apiSlice } from "../api/apiSlice";

export const certificatesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // public - works without logging in
    verifyCertificate: builder.query({
      query: (certificateId: string) => ({
        url: `certificates/verify/${encodeURIComponent(certificateId)}`,
        method: "GET",
      }),
      providesTags: ["Certificates"],
    }),

    getMyCertificates: builder.query({
      query: () => ({
        url: "my-certificates",
        method: "GET",
        credentials: "include",
      }),
      providesTags: ["Certificates"],
    }),

    getCertificateStatus: builder.query({
      query: (courseId: string) => ({
        url: `courses/${courseId}/certificate-status`,
        method: "GET",
        credentials: "include",
      }),
      providesTags: ["Certificates"],
    }),

    getInstructorCertificates: builder.query({
      query: () => ({
        url: "instructor/certificates",
        method: "GET",
        credentials: "include",
      }),
      providesTags: ["Certificates"],
    }),

    getAdminCertificates: builder.query({
      query: (search: string) => ({
        url: search
          ? `admin/certificates?search=${encodeURIComponent(search)}`
          : "admin/certificates",
        method: "GET",
        credentials: "include",
      }),
      providesTags: ["Certificates"],
    }),

    revokeCertificate: builder.mutation({
      query: ({ certificateId, reason }: { certificateId: string; reason?: string }) => ({
        url: `admin/certificates/${certificateId}/revoke`,
        method: "PUT",
        body: { reason },
        credentials: "include",
      }),
      invalidatesTags: ["Certificates"],
    }),

    reinstateCertificate: builder.mutation({
      query: (certificateId: string) => ({
        url: `admin/certificates/${certificateId}/reinstate`,
        method: "PUT",
        credentials: "include",
      }),
      invalidatesTags: ["Certificates"],
    }),
  }),
});

export const {
  useVerifyCertificateQuery,
  useGetMyCertificatesQuery,
  useGetCertificateStatusQuery,
  useGetInstructorCertificatesQuery,
  useGetAdminCertificatesQuery,
  useRevokeCertificateMutation,
  useReinstateCertificateMutation,
} = certificatesApi;
