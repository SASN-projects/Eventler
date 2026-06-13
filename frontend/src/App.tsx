// import { useState } from "react";
// import reactLogo from "./assets/react.svg";
// import viteLogo from "/vite.svg";
import { Box, IconButton, Avatar, Tooltip } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import "./App.css";
import DecisionPage from "./pages/slidingPages/DecisionPage";
import ProfilePage from "./pages/ProfilePage";
import { useState } from "react";

function App() {
  const [showProfile, setShowProfile] = useState(false);

  return (
    <Box sx={{ height: "100vh", width: "100vw", position: "relative" }}>
      {!showProfile && (
        <Tooltip title="Profile">
          <IconButton
            aria-label="open profile"
            onClick={() => setShowProfile(true)}
            size="large"
            sx={{
              position: "fixed",
              top: 16,
              right: 16,
              zIndex: (theme) => theme.zIndex.appBar + 2,
              width: 52,
              height: 52,
              p: 0,
            }}
          >
            <Avatar sx={{ width: 44, height: 44 }}>
              <PersonIcon sx={{ fontSize: 22 }} />
            </Avatar>
          </IconButton>
        </Tooltip>
      )}

      {showProfile ? (
        <ProfilePage onClose={() => setShowProfile(false)} />
      ) : (
        <DecisionPage />
      )}
    </Box>
  );
}

export default App;
