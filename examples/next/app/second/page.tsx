import { sx } from '@cssxio/cssx';
import Link from 'next/link';

export default function SecondPage() {
  return (
    <main data-cssx-second className={sx('min-h-screen bg-blue-100 p-8')}>
      <h1 className={sx('text-2xl font-semibold')}>Second route</h1>
      <Link href="/" className={sx('mt-4 inline-block rounded-md bg-brand p-3 text-white')}>
        Home
      </Link>
    </main>
  );
}
