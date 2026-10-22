// The screen registry: one component per Screen id.

import type { ComponentType } from "react";
import type { Screen } from "../../app/roles.ts";
import { LoginScreen } from "./Login.tsx";
import { InboxScreen } from "./Inbox.tsx";
import { TrendsScreen } from "./Trends.tsx";
import { ApprovalScreen } from "./Approval.tsx";
import { ProgrammeScreen } from "./Programme.tsx";
import { NewSubjectScreen } from "./NewSubject.tsx";
import { AssignmentsScreen } from "./Assignments.tsx";
import { CoursesScreen } from "./Courses.tsx";
import { ProposalScreen, StudioScreen } from "./Studio.tsx";
import { WatchScreen } from "./Watch.tsx";
import { ReportScreen } from "./Report.tsx";
import { DecideScreen } from "./Decide.tsx";
import { AcceptanceScreen } from "./Acceptance.tsx";
import { UploadScreen } from "./Upload.tsx";
import { LearnScreen } from "./Learn.tsx";
import { BacktestScreen } from "./Backtest.tsx";
import { DataRoomScreen } from "./DataRoom.tsx";
import { OfficeScreen } from "./Office.tsx";
import { IndexScreen } from "./Index.tsx";
import { GuideScreen } from "./Guide.tsx";
import { EvaluationScreen } from "./Evaluation.tsx";
import { JudgeScreen } from "./Judge.tsx";
import { KioskScreen } from "./Kiosk.tsx";
import { RecapScreen } from "./Recap.tsx";

export const SCREENS: Record<Screen, ComponentType> = {
  login: LoginScreen,
  index: IndexScreen,
  guide: GuideScreen,
  inbox: InboxScreen,
  trends: TrendsScreen,
  approval: ApprovalScreen,
  programme: ProgrammeScreen,
  "new-subject": NewSubjectScreen,
  assignments: AssignmentsScreen,
  courses: CoursesScreen,
  studio: StudioScreen,
  watch: WatchScreen,
  report: ReportScreen,
  decide: DecideScreen,
  proposal: ProposalScreen,
  acceptance: AcceptanceScreen,
  upload: UploadScreen,
  learn: LearnScreen,
  backtest: BacktestScreen,
  dataroom: DataRoomScreen,
  office: OfficeScreen,
  evaluation: EvaluationScreen,
  judge: JudgeScreen,
  kiosk: KioskScreen,
  recap: RecapScreen,
};
