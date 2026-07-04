import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import HomeIcon from "@mui/icons-material/Home";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import PersonIcon from "@mui/icons-material/Person";
import AddIcon from "@mui/icons-material/Add";
import "./App.css";
import DecisionPage from "./pages/slidingPages/DecisionPage";
import ProfilePage from "./pages/ProfilePage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./hooks/useAuth";
import { useState, type FunctionComponent } from "react";
import {
  AppContainer,
  MainContentArea,
  BottomNavPaper,
  HomeIconButton,
  PlusIconButton,
  ProfileIconButton,
} from "./pages/slidingPages/profile.styles";

const AppContent: FunctionComponent = () => {
  const { isAuthenticated, loading, user } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [resumeEvent, setResumeEvent] = useState<{
    eventId: string;
    mode: "slides" | "recommendations";
  } | null>(null);

  if (loading) {
    return <div style={{ height: "100vh", width: "100vw" }} />;
  }

  const handleHomeClick = () => {
    setShowProfile(false);
  };

  const handleProfileClick = () => {
    setShowProfile(true);
  };

  const handlePlusClick = () => {
    setShowProfile(false);
    setResumeEvent(null);
    setResetKey((prev) => prev + 1);
  };

  const handleContinueEvent = (event: {
    id: string;
    status?: string;
    createdById?: string;
    creator?: { id?: string };
  }) => {
    const normalizedStatus = (event.status || "").toLowerCase();
    const currentUserId = user?.id;
    const creatorId = event.creator?.id || event.createdById;
    const isEventCreator = Boolean(
      currentUserId && creatorId && creatorId === currentUserId,
    );

    setShowProfile(false);
    setResumeEvent({
      eventId: event.id,
      mode:
        normalizedStatus === "recommended" && isEventCreator
          ? "recommendations"
          : "slides",
    });
    setResetKey((prev) => prev + 1);
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={
          isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppContainer>
              <MainContentArea>
                {showProfile ? (
                  <ProfilePage
                    onClose={() => setShowProfile(false)}
                    onContinueEvent={handleContinueEvent}
                  />
                ) : (
                  <DecisionPage key={resetKey} resumeEvent={resumeEvent} />
                )}
              </MainContentArea>

              <BottomNavPaper elevation={4}>
                <HomeIconButton
                  onClick={handleHomeClick}
                  $active={!showProfile}
                >
                  {!showProfile ? (
                    <HomeIcon sx={{ fontSize: 26 }} />
                  ) : (
                    <HomeOutlinedIcon sx={{ fontSize: 26 }} />
                  )}
                </HomeIconButton>

                <PlusIconButton onClick={handlePlusClick}>
                  <AddIcon sx={{ fontSize: 30 }} />
                </PlusIconButton>

                <ProfileIconButton
                  onClick={handleProfileClick}
                  $active={showProfile}
                >
                  {showProfile ? (
                    <PersonIcon sx={{ fontSize: 26 }} />
                  ) : (
                    <PersonOutlineIcon sx={{ fontSize: 26 }} />
                  )}
                </ProfileIconButton>
              </BottomNavPaper>
            </AppContainer>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
