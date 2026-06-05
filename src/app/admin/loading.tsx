export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
        <p className="text-[#64748B] text-lg font-medium">加载中...</p>
        <p className="text-[#94A3B8] text-sm">正在验证管理权限</p>
      </div>
    </div>
  );
}
