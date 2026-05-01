// app/admin/table-arrangement/page.tsx
import { Suspense } from "react";
import TableArrangementClient from "./TableArrangementClient";

export default function TableArrangementPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading table arrangement...</p>
        </div>
      </div>
    }>
      <TableArrangementClient />
    </Suspense>
  );
}