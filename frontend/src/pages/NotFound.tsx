import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 p-4">
      <div className="text-center">
        <div className="text-7xl font-extrabold text-primary-600">404</div>
        <p className="mt-2 text-slate-600">Cette page n'existe pas.</p>
        <Link to="/" className="btn-primary mt-6 inline-flex">Retour à l'accueil</Link>
      </div>
    </div>
  );
}
