import { useState } from "react";
import {
  BottomNavigation,
  BottomNavigationAction,
  Box,
  CssBaseline,
  Paper,
} from "@mui/material";
import { Home, Add, Person } from "@mui/icons-material";

export default function HomePage() {
  const [value, setValue] = useState(0);

  return (
    <Box sx={{ pb: 7, height: "100vh" }}>
      <CssBaseline />
      <Paper sx={{ p: 2, height: "80vh", mt: 2, mx: 2 }} elevation={1}>
        <h1>Welcome to the Home Page</h1>
        <p>This is where your main content will be displayed.</p>
      </Paper>
      <Paper
        sx={{ position: "fixed", bottom: 0, left: 0, right: 0 }}
        elevation={3}
      >
        <BottomNavigation
          value={value}
          onChange={(_event, newValue) => setValue(newValue)}
          showLabels
        >
          <BottomNavigationAction label="Home" icon={<Home />} />
          <BottomNavigationAction label="Add" icon={<Add />} />
          <BottomNavigationAction label="Profile" icon={<Person />} />
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
