// Nav metadata: label + icon per screen. One icon set (Lucide), stroke 1.75,
// never emoji (spec 3.2).

import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  BookMarked,
  CheckSquare,
  Database,
  FlaskConical,
  Globe,
  Inbox,
  Layers,
  ListChecks,
  PenLine,
  PlusSquare,
  Target,
  TrendingUp,
  UploadCloud,
  Users,
  Workflow,
} from "lucide-react";
import type { Screen } from "../../app/roles.ts";

export const NAV_META: Record<Exclude<Screen, "login">, { label: string; icon: LucideIcon }> = {
  inbox: { label: "Home", icon: Inbox },
  trends: { label: "Trends", icon: TrendingUp },
  approval: { label: "Approvals", icon: CheckSquare },
  programme: { label: "Programme", icon: Layers },
  "new-subject": { label: "New subject", icon: PlusSquare },
  assignments: { label: "Assignments", icon: Users },
  courses: { label: "Courses", icon: BookOpen },
  studio: { label: "Course Studio", icon: PenLine },
  acceptance: { label: "Acceptance test", icon: FlaskConical },
  upload: { label: "Upload", icon: UploadCloud },
  backtest: { label: "Closed loop", icon: Target },
  dataroom: { label: "Data room", icon: Database },
  office: { label: "How it works", icon: Workflow },
  evaluation: { label: "Evaluation", icon: ListChecks },
  index: { label: "Relevance Index", icon: Globe },
  guide: { label: "Guide & progress", icon: BookMarked },
};

export function screenLabel(screen: Screen): string {
  if (screen === "login") return "Sign in";
  return NAV_META[screen]?.label ?? screen;
}
