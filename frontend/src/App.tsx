import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import HomeIcon from "@mui/icons-material/Home";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import PersonIcon from "@mui/icons-material/Person";
import AddIcon from "@mui/icons-material/Add";
import "./App.css";
import DecisionPage from "./pages/slidingPages/DecisionPage";
import ProfilePage from "./pages/ProfilePage";
import { useState, type FunctionComponent } from "react";
import { AppContainer, MainContentArea, BottomNavPaper, HomeIconButton, PlusIconButton, ProfileIconButton } from "./pages/slidingPages/profile.styles";

const App: FunctionComponent = () => {
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
    <AppContainer>
      <MainContentArea>
        {showProfile ? (
          <ProfilePage onClose={() => setShowProfile(false)} />
        ) : (
          <DecisionPage key={resetKey} />
        )}
      </MainContentArea>

      <BottomNavPaper elevation={4}>
        <HomeIconButton onClick={handleHomeClick} $active={!showProfile}>
          {!showProfile ? <HomeIcon sx={{ fontSize: 26 }} /> : <HomeOutlinedIcon sx={{ fontSize: 26 }} />}
        </HomeIconButton>

        <PlusIconButton onClick={handlePlusClick}>
          <AddIcon sx={{ fontSize: 30 }} />
        </PlusIconButton>

        <ProfileIconButton onClick={handleProfileClick} $active={showProfile}>
          {showProfile ? <PersonIcon sx={{ fontSize: 26 }} /> : <PersonOutlineIcon sx={{ fontSize: 26 }} />}
        </ProfileIconButton>
      </BottomNavPaper>
    </AppContainer>
  );
}

export default App;