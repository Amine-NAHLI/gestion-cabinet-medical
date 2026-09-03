import { redirect } from 'next/navigation';

export default function Home() {
  // Redirige automatiquement la racine du site vers le dashboard.
  // Le dashboard se chargera lui-même de vérifier si l'utilisateur est connecté
  // et le redirigera vers /login si ce n'est pas le cas.
  redirect('/dashboard');
}
