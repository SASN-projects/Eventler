import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import HomeIcon from "@mui/icons-material/Home";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import PersonIcon from "@mui/icons-material/Person";
import AddIcon from "@mui/icons-material/Add";
import "./App.css";
import DecisionPage from "./pages/slidingPages/DecisionPage";
import ProfilePage from "./pages/ProfilePage";
import HomeFeedPage from "./pages/homePage/HomeFeedPage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import { AuthProvider } from "./contexts/AuthContext";
import { FavoritesProvider } from "./contexts/FavoritesContext";
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

type AppView = "feed" | "create" | "profile";
import NotificationInbox from "./components/NotificationInbox";

const AppContent: FunctionComponent = () => {
  const { isAuthenticated, loading, user } = useAuth();
  const [view, setView] = useState<AppView>("feed");
  const [resetKey, setResetKey] = useState(0);
  const [resumeEvent, setResumeEvent] = useState<{
    eventId: string;
    mode: "slides" | "recommendations";
  } | null>(null);

  if (loading) {
    return <div style={{ height: "100vh", width: "100vw" }} />;
  }

  const handleHomeClick = () => {
    setView("feed");
  };

  const handleProfileClick = () => {
    setView("profile");
  };

  const handlePlusClick = () => {
    setView("create");
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

    setView("create");
    const isRecommendationsMode =
      (normalizedStatus === "recommendations_ready" || normalizedStatus === "recommended") &&
      isEventCreator;

    setResumeEvent({
      eventId: event.id,
      mode: isRecommendationsMode ? "recommendations" : "slides",
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
              {/* Top-screen Questionnaire Inbox Indicator */}
              <div
                style={{
                  position: "fixed",
                  top: 16,
                  right: 16,
                  zIndex: 1200,
                }}
              >
                <NotificationInbox
                  onSelectEvent={(eventId) => handleContinueEvent({ id: eventId })}
                  refreshTrigger={resetKey}
                />
              </div>

              <MainContentArea>
                {view === "profile" ? (
                  <ProfilePage
                    onClose={() => setView("feed")}
                    onContinueEvent={handleContinueEvent}
                  />
                ) : view === "create" ? (
                  <DecisionPage
                    key={resetKey}
                    resumeEvent={resumeEvent}
                    onFinalSelectionComplete={() => setResumeEvent(null)}
                    onResumeConsumed={() => setResumeEvent(null)}
                  />
                ) : (
                  <HomeFeedPage />
                )}
              </MainContentArea>

              <BottomNavPaper elevation={4}>
                <HomeIconButton
                  onClick={handleHomeClick}
                  $active={view === "feed"}
                >
                  {view === "feed" ? (
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
                  $active={view === "profile"}
                >
                  {view === "profile" ? (
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
        <FavoritesProvider>
          <AppContent />
        </FavoritesProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
