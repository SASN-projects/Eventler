import { Box, CssBaseline, Paper } from "@mui/material";

export default function ProfilePage() {
  return (
    <Box>
      <CssBaseline />
      <Paper sx={{ p: 2, height: "80vh", mt: 2, mx: 2 }} elevation={1}>
        <h1>Welcome to the Profile Page</h1>
        <p>This is where your main content will be displayed.</p>
      </Paper>
    </Box>
  );
}
