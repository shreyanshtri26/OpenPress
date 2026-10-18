export default function Notification({ message, type = 'info' }) {
  if (!message) return null;
  const color =
    type === 'error'
      ? 'bg-red-100 text-red-700'
      : type === 'success'
        ? 'bg-green-100 text-green-700'
        : 'bg-blue-100 text-blue-700';
  return <div className={`${color} p-2 rounded mb-4`}>{message}</div>;
}
