import { Routes, Route } from 'react-router-dom';

import Home from '../pages/Home';
import Login from '../pages/Login';
import Inscription from '../pages/Inscription';

import Dashboard from '../pages/Dashboard';
import Inscriptions from '../pages/Inscriptions';
import Stagiaires from '../pages/Stagiaires';
import Taches from '../pages/Taches';
import Rapports from '../pages/Rapports';
import Presences from '../pages/Presences';
import Paiements from '../pages/Paiements';
import Evaluations from '../pages/Evaluations';

import NotFound from '../pages/NotFound';

import { Layout } from '../components/layout/Layout';
import { PrivateRoute } from './PrivateRoute';



export function AppRoutes() {
  return (
    <Routes>

      {/* =========================
          ROUTES PUBLIQUES
      ========================= */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/inscription" element={<Inscription />} />

      {/* =========================
          ESPACE ADMIN / RH / TUTEUR
      ========================= */}
      <Route
        path="/app"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />

        <Route
          path="inscriptions"
          element={<Inscriptions />}
        />

        <Route
          path="stagiaires"
          element={<Stagiaires />}
        />

        <Route
          path="taches"
          element={<Taches />}
        />

        <Route
          path="rapports"
          element={<Rapports />}
        />

        <Route
          path="presences"
          element={<Presences />}
        />

        <Route
          path="paiements"
          element={<Paiements />}
        />

        <Route
          path="evaluations"
          element={<Evaluations />}
        />
      </Route>

      {/* =========================
          ESPACE STAGIAIRE
      ========================= */}
     

      {/* =========================
          PAGE INTROUVABLE
      ========================= */}
      <Route
        path="*"
        element={<NotFound />}
      />

    </Routes>
  );
}