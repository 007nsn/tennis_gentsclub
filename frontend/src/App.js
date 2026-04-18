import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "./components/ui/sonner";
import Layout from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";

// Pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Schedule from "./pages/Schedule";
import BestPartnerships from "./pages/TeamLadder";
import SoloLadder from "./pages/SoloLadder";
import SeasonStandings from "./pages/SeasonStandings";
import MatchHistory from "./pages/MatchHistory";
import Education from "./pages/Education";
import ArticleDetail from "./pages/ArticleDetail";
import SubmitResult from "./pages/SubmitResult";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import Availability from "./pages/Availability";
import Chatroom from "./pages/Chatroom";
import OpponentScout from "./pages/OpponentScout";
import StrategyBot from "./pages/StrategyBot";
import HeadToHead from "./pages/HeadToHead";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/schedule" element={<Schedule />} />

            {/* Member-only routes */}
            <Route path="/partnerships" element={<ProtectedRoute><BestPartnerships /></ProtectedRoute>} />
            <Route path="/solo-ladder" element={<ProtectedRoute><SoloLadder /></ProtectedRoute>} />
            <Route path="/season-standings" element={<ProtectedRoute><SeasonStandings /></ProtectedRoute>} />
            <Route path="/match-history" element={<ProtectedRoute><MatchHistory /></ProtectedRoute>} />
            <Route path="/education" element={<ProtectedRoute><Education /></ProtectedRoute>} />
            <Route path="/education/:id" element={<ProtectedRoute><ArticleDetail /></ProtectedRoute>} />
            <Route path="/submit-result" element={<ProtectedRoute><SubmitResult /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/availability" element={<ProtectedRoute><Availability /></ProtectedRoute>} />
            <Route path="/chatroom" element={<ProtectedRoute><Chatroom /></ProtectedRoute>} />
            <Route path="/opponent-scout" element={<ProtectedRoute><OpponentScout /></ProtectedRoute>} />
            <Route path="/strategy-bot" element={<ProtectedRoute><StrategyBot /></ProtectedRoute>} />
            <Route path="/head-to-head" element={<ProtectedRoute><HeadToHead /></ProtectedRoute>} />

            {/* Admin-only route */}
            <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
          </Routes>
        </Layout>
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
