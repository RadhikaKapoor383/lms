import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdminSidebar from "@/components/AdminSidebar";
import AdminProtected from "@/components/AdminProtected";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminProtected>
      <Header />
      <main className="mx-auto flex max-w-6xl px-6 py-10">
        <AdminSidebar />
        <div className="flex-1 pl-8">{children}</div>
      </main>
      <Footer />
    </AdminProtected>
  );
}