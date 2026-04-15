import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "./components/ui/sonner";
import Layout from "./components/Layout";

// Pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Schedule from "./pages/Schedule";
import TeamLadder from "./pages/TeamLadder";
import SoloLadder from "./pages/SoloLadder";
import Education from "./pages/Education";
import ArticleDetail from "./pages/ArticleDetail";
import SubmitResult from "./pages/SubmitResult";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import Availability from "./pages/Availability";
import Messages from "./pages/Messages";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/team-ladder" element={<TeamLadder />} />
            <Route path="/solo-ladder" element={<SoloLadder />} />
            <Route path="/education" element={<Education />} />
            <Route path="/education/:id" element={<ArticleDetail />} />
            <Route path="/submit-result" element={<SubmitResult />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/availability" element={<Availability />} />
            <Route path="/messages" element={<Messages />} />
          </Routes>
        </Layout>
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
