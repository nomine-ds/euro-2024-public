import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Search,
  Network,
  User,
  Users,
  Swords,
  Trophy,
  FlaskConical,
  Sparkles,
  Home,
  GitCompare,
  Terminal,
  LayoutGrid,
  CalendarDays,
  Activity,
  RotateCw,
} from "lucide-react";

export const featureIcons: Record<string, LucideIcon> = {
  bot: Bot,
  "match-similarity": Search,
  clusters: Network,
  players: User,
  "player-comparison": Swords,
  compare: Trophy,
  lab: FlaskConical,
  counterfactual: Sparkles,
};

export const navIcons: Record<string, LucideIcon> = {
  "/": Home,
  "/players": Users,
  "/match-similarity": Search,
  "/clusters": LayoutGrid,
  "/compare": Trophy,
  "/player-comparison": GitCompare,
  "/bot": Bot,
  "/lab": Terminal,
  "/counterfactual": Sparkles,
};

export const statIcons: Record<string, LucideIcon> = {
  Matches: CalendarDays,
  Events: Activity,
  Teams: Users,
  "Match 360": RotateCw,
};
