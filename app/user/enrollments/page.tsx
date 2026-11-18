
import EnrollmentView from "@/components/enrollments/EnrollmentView";
export default function EnrollmentsPage() {
  return (
    <div className="container mx-auto p-4 min-h-screen">
      <h1 className="text-2xl font-bold my-8">Записи на курсы</h1>
      <EnrollmentView />
    </div>
  );
}