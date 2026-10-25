"use client";

import Link from "next/link";
import { useState } from "react";
import Loader from "@/components/Loader";
import { useGetInstructorsQuery } from "@/redux/features/admin/adminApi";
import {
  useGetDepartmentsQuery,
  useSetInstructorDepartmentMutation,
} from "@/redux/features/departments/departmentsApi";

export default function AdminInstructorsPage() {
  const { data, isLoading, isError } = useGetInstructorsQuery(undefined);
  const instructors: any[] = data?.instructors || [];
  const { data: departmentData } = useGetDepartmentsQuery(undefined);
  const departments: any[] = departmentData?.departments || [];
  const [setDepartment, { isLoading: isSettingDepartment }] = useSetInstructorDepartmentMutation();
  const [departmentError, setDepartmentError] = useState("");

  const changeDepartment = async (instructorId: string, departmentId: string) => {
    setDepartmentError("");
    try {
      await setDepartment({ instructorId, departmentId }).unwrap();
    } catch (err: any) {
      setDepartmentError(err?.data?.message || "Could not change the department");
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl text-ink dark:text-parchment">Instructors</h1>
      <p className="mt-1 text-sm text-ink/60 dark:text-parchment/60">
        Who teaches what, and how their students are doing. Open one for the full picture. Change
        roles or deactivate accounts under Users.
      </p>

      {departmentError && (
        <p role="alert" className="mt-4 text-sm text-clay">
          {departmentError}
        </p>
      )}
      {isLoading && <Loader />}
      {isError && <p className="mt-6 text-ink/60 dark:text-parchment/60">Couldn&apos;t load instructors.</p>}
      {!isLoading && !isError && instructors.length === 0 && (
        <p className="mt-6 text-ink/60 dark:text-parchment/60">No instructors yet. Give someone the instructor role under Users.</p>
      )}

      <div className="mt-8 overflow-x-auto">
        {instructors.length > 0 && (
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-ink/50 dark:text-parchment/50">
              <tr>
                <th className="pb-3 font-medium">Instructor</th>
                <th className="pb-3 font-medium">Department</th>
                <th className="pb-3 font-medium">Courses</th>
                <th className="pb-3 font-medium">Published</th>
                <th className="pb-3 font-medium">Pending</th>
                <th className="pb-3 font-medium">Students</th>
                <th className="pb-3 font-medium">Completion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-parchment-dark dark:divide-ink-light">
              {instructors.map((i) => (
                <tr key={i._id} className={i.isActive ? "" : "opacity-60"}>
                  <td className="py-4">
                    <Link
                      href={`/admin/instructors/${i._id}`}
                      className="font-medium text-ink hover:underline dark:text-parchment"
                    >
                      {i.name}
                    </Link>
                    {!i.isActive && (
                      <span className="ml-2 rounded-full bg-clay/20 px-2 py-0.5 text-xs text-clay">
                        Deactivated
                      </span>
                    )}
                    <p className="text-ink/60 dark:text-parchment/60">{i.email}</p>
                  </td>
                  <td className="py-4 pr-4">
                    <select
                      aria-label={`Department for ${i.name}`}
                      value={i.department?._id || ""}
                      disabled={isSettingDepartment}
                      onChange={(e) => changeDepartment(i._id, e.target.value)}
                      className="max-w-[12rem] border border-parchment-dark bg-transparent px-2 py-1 text-sm text-ink dark:border-ink-light dark:text-parchment"
                    >
                      <option value="">No department</option>
                      {departments.map((d: any) => (
                        <option key={d._id} value={d._id}>
                          {d.name}
                        </option>
                      ))}
                      {/* the list may still be loading: keep the current one showing */}
                      {i.department?._id && !departments.some((d: any) => d._id === i.department._id) && (
                        <option value={i.department._id}>{i.department.name}</option>
                      )}
                    </select>
                  </td>
                  <td className="py-4 text-ink dark:text-parchment">{i.courses}</td>
                  <td className="py-4 text-ink dark:text-parchment">{i.published}</td>
                  <td className="py-4 text-ink dark:text-parchment">
                    {i.pending > 0 ? (
                      <span className="rounded-full bg-mustard/30 px-2.5 py-0.5 text-mustard-dark">
                        {i.pending}
                      </span>
                    ) : (
                      0
                    )}
                  </td>
                  <td className="py-4 text-ink dark:text-parchment">{i.students}</td>
                  <td className="py-4 text-ink dark:text-parchment">{i.completionRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
