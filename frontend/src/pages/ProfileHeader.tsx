import { Box, Stack, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import PersonIcon from "@mui/icons-material/Person";
import type { User } from "./slidingPages/profile.types";
import { TopBanner, HeaderButton, UserAvatar } from "./slidingPages/profile.styles";
import type { FunctionComponent } from "react";

interface ProfileHeaderProps {
  user: User;
  onClose: () => void;
  onEditClick: () => void;
}

const ProfileHeader: FunctionComponent<ProfileHeaderProps> = ({ user, onClose, onEditClick }) => {
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

      <Stack direction="row" alignItems="center" spacing={2.5}>
        <UserAvatar>
          <PersonIcon sx={{ fontSize: "40px" }} />
        </UserAvatar>
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