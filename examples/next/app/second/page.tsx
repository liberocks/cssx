import { sx } from '@cssxio/cssx';
import Link from 'next/link';

export default function SecondPage() {
  return (
    <main data-cssx-second className={sx('min-h-screen p-8 bg-blue-100')}>
      <h1 className={sx('text-2xl font-semibold')}>Second route</h1>
      <Link href="/" className={sx('inline-block mt-4 p-3 text-white rounded-md bg-brand')}>
        Home
      </Link>
    </main>
  );
}
