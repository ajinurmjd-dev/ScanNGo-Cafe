export default function OrderLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-md px-4 py-8">
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Memuat menu dan data meja...</p>
        </div>
      </div>
    </div>
  );
}
