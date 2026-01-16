import "./App.css";
import { Routes, Route, useNavigate } from "react-router-dom";
import FeedPage from "./pages/homePage/FeedPage";
import { useState } from "react";
import { BottomNavigation, BottomNavigationAction, Paper } from "@mui/material";
import { Add, Home, Person } from "@mui/icons-material";
import AddEventPage from "./pages/addEventPage/AddEventPage";
import ProfilePage from "./pages/profilePage/ProfilePage";

function App() {
  const [bottomNavBarTab, setBottomNavBarTab] = useState<number>(0);
  const navigate = useNavigate();

  return (
    <>
      <Routes>
        <Route path="/" element={<FeedPage />} />
        <Route path="/event" element={<AddEventPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
      <Paper
        sx={{ position: "fixed", bottom: 0, left: 0, right: 0 }}
        elevation={3}
      >
        <BottomNavigation
          value={bottomNavBarTab}
          onChange={(_event, newValue) => setBottomNavBarTab(newValue)}
          showLabels
        >
          <BottomNavigationAction
            onClick={() => navigate("/")}
            label="Home"
            icon={<Home />}
          />
          <BottomNavigationAction
            onClick={() => navigate("/event")}
            label="Add"
            icon={<Add />}
          />
          <BottomNavigationAction
            onClick={() => navigate("/profile")}
            label="Profile"
            icon={<Person />}
          />
        </BottomNavigation>
      </Paper>
    </>
  );
}

export default App;
