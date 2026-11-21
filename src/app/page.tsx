import { redirect } from 'next/navigation';

export default function Home() {
  // Redirige directement vers /login pour une URL propre sans query string callbackUrl
  redirect('/login');
}
