/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import Player from "./pages/Player";
import ChannelDetail from "./pages/ChannelDetail";
import UserManagement from "./pages/UserManagement";
import Navbar from "./components/Navbar";

export default function App() {
  const { user, appUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-red-500/30">
        <Navbar />
        <main>
          <Routes>
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/admin" />} />
            
            {/* Player route is public */}
            <Route path="/play/:channelSlug" element={<Player />} />

            {/* Admin routes protected */}
            <Route 
              path="/admin" 
              element={appUser ? <AdminDashboard /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/admin/channel/:channelId" 
              element={appUser ? <ChannelDetail /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/admin/users" 
              element={appUser?.role === 'admin' ? <UserManagement /> : <Navigate to="/admin" />} 
            />

            <Route path="*" element={<Navigate to="/admin" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

