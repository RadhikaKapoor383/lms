"use client";

import RoleSidebar, { SidebarLink } from "./RoleSidebar";
import { useCan } from "@/hooks/useCan";

const links: SidebarLink[] = [
  { label: "Dashboard", href: "/instructor" },
  { label: "Create course", href: "/instructor/create-course" },
  { label: "Students", href: "/instructor/students" },
  { label: "Assignments", href: "/instructor/assignments" },
  { label: "Quizzes", href: "/instructor/quizzes" },
  { label: "Announcements", href: "/instructor/announcements" },
  { label: "Discussions", href: "/instructor/discussions" },
  { label: "Reviews", href: "/instructor/reviews" },
  { label: "Analytics", href: "/instructor/analytics" },
  { label: "Certificates", href: "/instructor/certificates" },
  { label: "Profile", href: "/instructor/profile" },
];

export default function InstructorSidebar() {
  const can = useCan();
  const visible = links.filter((l) => l.href !== "/instructor/create-course" || can("course.create"));
  return <RoleSidebar title="Instructor" links={visible} homeHref="/instructor" menuId="instructor-menu" />;
}
