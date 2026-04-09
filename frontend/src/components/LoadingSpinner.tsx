export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
