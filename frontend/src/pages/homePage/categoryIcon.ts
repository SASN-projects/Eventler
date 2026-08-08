import type { SvgIconTypeMap } from "@mui/material";
import type { OverridableComponent } from "@mui/material/OverridableComponent";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import LocalCafeIcon from "@mui/icons-material/LocalCafe";
import MuseumIcon from "@mui/icons-material/Museum";
import ParkIcon from "@mui/icons-material/Park";
import NightlifeIcon from "@mui/icons-material/Nightlife";
import TheaterComedyIcon from "@mui/icons-material/TheaterComedy";
import SportsBarIcon from "@mui/icons-material/SportsBar";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import SchoolIcon from "@mui/icons-material/School";
import PlaceIcon from "@mui/icons-material/Place";

const CATEGORY_ICON_RULES: Array<{ keywords: string[]; icon: OverridableComponent<SvgIconTypeMap> }> = [
  { keywords: ["restaurant", "food", "dining", "bistro", "kitchen"], icon: RestaurantIcon },
  { keywords: ["cafe", "coffee"], icon: LocalCafeIcon },
  { keywords: ["museum", "gallery", "art"], icon: MuseumIcon },
  { keywords: ["park", "garden", "outdoor", "beach"], icon: ParkIcon },
  { keywords: ["bar", "club", "night", "lounge"], icon: NightlifeIcon },
  { keywords: ["theater", "theatre", "cinema", "show", "music"], icon: TheaterComedyIcon },
  { keywords: ["pub", "brewery"], icon: SportsBarIcon },
  { keywords: ["shop", "market", "mall", "store"], icon: ShoppingBagIcon },
  { keywords: ["gym", "fitness", "sport", "climbing"], icon: FitnessCenterIcon },
  { keywords: ["education", "workshop", "class", "science"], icon: SchoolIcon },
];

export function getCategoryIcon(category: string | null | undefined): OverridableComponent<SvgIconTypeMap> {
  if (!category) return PlaceIcon;
  const lower = category.toLowerCase();
  const match = CATEGORY_ICON_RULES.find(({ keywords }) => keywords.some((keyword) => lower.includes(keyword)));
  return match?.icon ?? PlaceIcon;
}
