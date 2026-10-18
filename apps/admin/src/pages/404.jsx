import Link from '@/components/common/Link';

const NotFoundPage = () => (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-gray-500">404</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-900">This page doesn&apos;t exist.</h1>
        <Link href="/" className="mt-8 rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800">
            Back to the dashboard
        </Link>
    </main>
);

export default NotFoundPage;
