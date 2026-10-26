"use client";

import RoleSidebar, { SidebarLink } from "./RoleSidebar";

const links: SidebarLink[] = [
  { label: "Overview", href: "/admin" },
  { label: "Create course", href: "/admin/create-course" },
  { label: "All courses", href: "/admin/all-courses" },
  { label: "Categories", href: "/admin/categories" },
  { label: "Departments", href: "/admin/departments" },
  { label: "Course approvals", href: "/admin/course-approvals" },
  { label: "Instructors", href: "/admin/instructors" },
  { label: "Enrollments", href: "/admin/enrollments" },
  { label: "Analytics", href: "/admin/analytics" },
  { label: "Certificates", href: "/admin/certificates" },
  { label: "Reviews", href: "/admin/reviews" },
  { label: "Flagged content", href: "/admin/reports" },
  { label: "Announcements", href: "/admin/announcements" },
  { label: "Users", href: "/admin/users" },
  { label: "Permissions", href: "/admin/permissions" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Notifications", href: "/admin/notifications" },
  { label: "Activity log", href: "/admin/activity-log" },
  { label: "Settings", href: "/admin/settings" },
];

export default function AdminSidebar() {
  return <RoleSidebar title="Admin" links={links} homeHref="/admin" menuId="admin-menu" />;
}
