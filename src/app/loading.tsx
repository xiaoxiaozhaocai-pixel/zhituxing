export default function RootLoading() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
        <p className="text-[#64748B] text-sm">加载中...</p>
      </div>
    </div>
  );
}
