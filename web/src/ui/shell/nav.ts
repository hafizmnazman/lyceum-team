// Nav metadata: label + icon per screen. One icon set (Lucide), stroke 1.75,
// never emoji (spec 3.2).

import type { LucideIcon } from "lucide-react";
import {
  GraduationCap,
  BookOpen,
  BookMarked,
  CheckSquare,
  ClipboardList,
  FileSearch,
  Database,
  FlaskConical,
  Footprints,
  Globe,
  Inbox,
  Layers,
  ListChecks,
  MonitorPlay,
  PenLine,
  PlusSquare,
  ScrollText,
  Settings,
  Scale,
  Target,
  Telescope,
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
  watch: { label: "Watch", icon: Telescope },
  report: { label: "Report", icon: FileSearch },
  decide: { label: "Decide", icon: Scale },
  proposal: { label: "Change proposal", icon: ClipboardList },
  programme: { label: "Programme", icon: Layers },
  "new-subject": { label: "New subject", icon: PlusSquare },
  assignments: { label: "Assignments", icon: Users },
  courses: { label: "Courses", icon: BookOpen },
  studio: { label: "Course Studio", icon: PenLine },
  acceptance: { label: "Acceptance test", icon: FlaskConical },
  upload: { label: "Upload", icon: UploadCloud },
  learn: { label: "Learn", icon: GraduationCap },
  backtest: { label: "Closed loop", icon: Target },
  dataroom: { label: "Data room", icon: Database },
  office: { label: "How it works", icon: Workflow },
  evaluation: { label: "Evaluation", icon: ListChecks },
  index: { label: "Relevance Index", icon: Globe },
  guide: { label: "Guide & progress", icon: BookMarked },
  settings: { label: "Settings", icon: Settings },
  onboarding: { label: "Getting started", icon: PlusSquare },
  judge: { label: "For judges", icon: Footprints },
  kiosk: { label: "Kiosk", icon: MonitorPlay },
  recap: { label: "Term recap", icon: ScrollText },
};

export function screenLabel(screen: Screen): string {
  if (screen === "login") return "Sign in";
  return NAV_META[screen]?.label ?? screen;
}
