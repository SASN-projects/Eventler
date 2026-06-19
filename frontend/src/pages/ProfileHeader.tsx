import { Box, Button, Stack, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import type { User } from "./slidingPages/profile.types";
import { TopBanner, HeaderButton, UserAvatar } from "./slidingPages/profile.styles";
import type { FunctionComponent } from "react";
import { useAuth } from "../hooks/useAuth";

interface ProfileHeaderProps {
  user: User;
  onClose: () => void;
  onEditClick: () => void;
}

const ProfileHeader: FunctionComponent<ProfileHeaderProps> = ({ user, onClose, onEditClick }) => {
  const { logout } = useAuth();
  const displayName = `${user.firstName} ${user.lastName}`.trim() || user.username || "name mame";

  return (
    <TopBanner>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <HeaderButton onClick={onClose}>
          <ArrowBackIcon />
        </HeaderButton>
        <HeaderButton onClick={onEditClick}>
          <MoreHorizIcon />
        </HeaderButton>
      </Stack>

      <Stack direction="row" alignItems="flex-start" spacing={2.5}>
        <Stack direction="column" alignItems="center" spacing={4}>
          <UserAvatar>
            <PersonIcon sx={{ fontSize: "40px" }} />
          </UserAvatar>
          <Button
            onClick={logout}
            startIcon={<LogoutIcon sx={{ fontSize: 14 }} />}
            size="small"
            sx={{
              color: "rgba(255,255,255,0.85)",
              borderColor: "rgba(255,255,255,0.4)",
              border: "1px solid",
              borderRadius: "20px",
              textTransform: "none",
              fontSize: "11px",
              fontWeight: 600,
              px: 1.5,
              py: 0.4,
              minWidth: 0,
              backdropFilter: "blur(4px)",
              backgroundColor: "rgba(255,255,255,0.1)",
              '&:hover': {
                backgroundColor: "rgba(255,255,255,0.2)",
                borderColor: "rgba(255,255,255,0.7)",
              },
            }}
          >
            Logout
          </Button>
        </Stack>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: "white" }}>
            {displayName}
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.9)", fontWeight: 500 }}>
            {user.occupation || "Eventler Enthusiast"}
          </Typography>
          <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.75)" }}>
            {user.email}
          </Typography>
        </Box>
      </Stack>
    </TopBanner>
  );
};

export default ProfileHeader;