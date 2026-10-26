import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InstructorSidebar from "@/components/InstructorSidebar";
import RoleProtected from "@/components/RoleProtected";

export default function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleProtected allowedRoles={["instructor"]}>
      <Header hide={["role"]} />
      <main className="mx-auto flex max-w-6xl flex-col px-4 py-6 sm:px-6 md:flex-row md:py-10">
        <InstructorSidebar />
        <div className="min-w-0 flex-1 pt-6 md:pl-8 md:pt-0">{children}</div>
      </main>
      <Footer />
    </RoleProtected>
  );
}
