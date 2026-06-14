import { Box, Paper, IconButton } from "@mui/material";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import HomeIcon from "@mui/icons-material/Home";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import PersonIcon from "@mui/icons-material/Person";
import AddIcon from "@mui/icons-material/Add";
import "./App.css";
import DecisionPage from "./pages/slidingPages/DecisionPage";
import ProfilePage from "./pages/ProfilePage";
import { useState } from "react";

function App() {
  const [showProfile, setShowProfile] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const handleHomeClick = () => {
    setShowProfile(false);
  };

  const handleProfileClick = () => {
    setShowProfile(true);
  };

  const handlePlusClick = () => {
    setShowProfile(false);
    setResetKey((prev) => prev + 1);
  };

  return (
    <Box
      sx={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        bgcolor: "#f8f9fa",
        overflow: "hidden",
      }}
    >
      {/* Main Content Area */}
      <Box sx={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {showProfile ? (
          <ProfilePage onClose={() => setShowProfile(false)} />
        ) : (
          <DecisionPage key={resetKey} />
        )}
      </Box>

      {/* Global Bottom Navigation Bar */}
      <Paper
        elevation={4}
        sx={{
          height: 72,
          bgcolor: "white",
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          borderTopLeftRadius: "28px",
          borderTopRightRadius: "28px",
          boxShadow: "0 -5px 25px rgba(0,0,0,0.06)",
          zIndex: 1000,
        }}
      >
        {/* Home Button */}
        <IconButton
          onClick={handleHomeClick}
          sx={{
            background: !showProfile ? "linear-gradient(45deg, #ffe5d9 0%, #ffd6db 100%)" : "transparent",
            borderRadius: "16px",
            color: !showProfile ? "#ff5876" : "#757575",
            p: 1.25,
            transition: "all 0.25s ease",
            "&:hover": { transform: "scale(1.05)" },
          }}
        >
          {!showProfile ? <HomeIcon sx={{ fontSize: 26 }} /> : <HomeOutlinedIcon sx={{ fontSize: 26 }} />}
        </IconButton>

        {/* Plus Button */}
        <IconButton
          onClick={handlePlusClick}
          sx={{
            background: "linear-gradient(135deg, #b3c5ff 0%, #e0c3fc 100%)",
            borderRadius: "50%",
            color: "white",
            width: 54,
            height: 54,
            boxShadow: "0 5px 15px rgba(224, 195, 252, 0.5)",
            transform: "translateY(-14px)",
            transition: "transform 0.2s, box-shadow 0.2s",
            "&:hover": {
              transform: "translateY(-16px) scale(1.05)",
              boxShadow: "0 8px 20px rgba(224, 195, 252, 0.7)",
            },
          }}
        >
          <AddIcon sx={{ fontSize: 30 }} />
        </IconButton>

        {/* Profile Button */}
        <IconButton
          onClick={handleProfileClick}
          sx={{
            background: showProfile ? "linear-gradient(45deg, #ffe5d9 0%, #ffd6db 100%)" : "transparent",
            borderRadius: "16px",
            color: showProfile ? "#ff5876" : "#757575",
            p: 1.25,
            transition: "all 0.25s ease",
            "&:hover": { transform: "scale(1.05)" },
          }}
        >
          {showProfile ? <PersonIcon sx={{ fontSize: 26 }} /> : <PersonOutlineIcon sx={{ fontSize: 26 }} />}
        </IconButton>
      </Paper>
    </Box>
  );
}

export default App;
