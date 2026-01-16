import {
  Box,
  CssBaseline,
  Paper,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Grid,
  IconButton,
  TextField,
} from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";

import localImage from "../../../public/image.png";
import { ShareOutlined } from "@mui/icons-material";

export default function FeedPage() {
  // Sample data for demonstration
  const feedItems = [
    {
      id: 1,
      title: "Crazy at Teder",
      location: "Tel Aviv, Hamesila Park",
      date: "January 20, 2026",
      time: "10:00 AM - 6:00 PM",
      image: "https://http.cat/status/101",
    },
    {
      id: 2,
      title: "Music Festival",
      location: "Central Park, New York",
      date: "February 15, 2026",
      time: "12:00 PM - 11:00 PM",
      image: "https://via.placeholder.com/300x200?text=Music+Festival",
    },
    {
      id: 3,
      title: "Art Exhibition",
      location: "Modern Art Museum, Los Angeles",
      date: "March 10, 2026",
      time: "9:00 AM - 5:00 PM",
      image: "https://via.placeholder.com/300x200?text=Art+Exhibition",
    },
    {
      id: 4,
      title: "Sports Tournament",
      location: "Stadium Arena, Chicago",
      date: "April 5, 2026",
      time: "2:00 PM - 8:00 PM",
      image: "https://via.placeholder.com/300x200?text=Sports+Tournament",
    },
    {
      id: 5,
      title: "Sports Tournament",
      location: "Stadium Arena, Chicago",
      date: "April 5, 2026",
      time: "2:00 PM - 8:00 PM",
      image: "https://via.placeholder.com/300x200?text=Sports+Tournament",
    },
  ];

  return (
    <>
      <CssBaseline />
      <Paper elevation={1}>
        <Box
          height={"150px"}
          sx={{ background: "linear-gradient(90deg, #9ec5ff, #b69eff)" }}
        >
          <Typography variant="h4" component="h1" color="white" gutterBottom>
            Eventler
          </Typography>
          <TextField
            sx={{ marginTop: 2 }}
            variant="outlined"
            size="small"
            placeholder="Find the perfect event..."
          />
        </Box>
        <Grid
          container
          sx={{ justifyContent: "center", alignItems: "center" }}
          spacing={2}
        >
          {feedItems.map((item) => (
            <Card
              sx={{
                display: "flex",
                flexDirection: "column",
                height: 150,
                width: "90%",
                borderRadius: 4,
                position: "relative",
              }}
            >
              <IconButton
                sx={{
                  position: "absolute",
                  bottom: 5,
                  right: 5,
                  borderRadius: 2,
                  backgroundColor: "rgba(148, 86, 205, 0.6)",
                  "&:hover": {
                    backgroundColor: "rgba(148, 86, 205, 1)",
                  },
                }}
                size="small"
              >
                <ShareOutlined fontSize="small" />
              </IconButton>
              <IconButton
                sx={{
                  position: "absolute",
                  bottom: 5,
                  right: 40,
                  borderRadius: 2,
                  backgroundColor: "rgba(255, 158, 158, 0.6)",
                  "&:hover": {
                    backgroundColor: "rgba(255, 158, 158, 1)",
                  },
                }}
                size="small"
              >
                <FavoriteIcon fontSize="small" />
              </IconButton>
              <CardMedia
                component="img"
                sx={{ height: "75%", objectFit: "fill" }}
                image={localImage}
                alt={item.title}
              />
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  height: "25%",
                  padding: "0px",
                }}
              >
                <CardContent sx={{ flex: "1 0 auto", padding: "0px" }}>
                  <Typography
                    variant="h6"
                    component="div"
                    sx={{
                      display: "flex",
                      padding: "5px",
                    }}
                  >
                    {item.title}
                  </Typography>
                </CardContent>
              </Box>
            </Card>
          ))}
        </Grid>
      </Paper>
    </>
  );
}
