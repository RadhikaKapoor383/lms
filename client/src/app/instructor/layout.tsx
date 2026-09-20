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
      <Header />
      <main className="mx-auto flex max-w-6xl px-6 py-10">
        <InstructorSidebar />
        <div className="flex-1 pl-8">{children}</div>
      </main>
      <Footer />
    </RoleProtected>
  );
}
