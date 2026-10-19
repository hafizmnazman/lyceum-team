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
import { StudioScreen } from "./Studio.tsx";
import { AcceptanceScreen } from "./Acceptance.tsx";
import { UploadScreen } from "./Upload.tsx";
import { BacktestScreen } from "./Backtest.tsx";
import { DataRoomScreen } from "./DataRoom.tsx";
import { OfficeScreen } from "./Office.tsx";
import { IndexScreen } from "./Index.tsx";
import { GuideScreen } from "./Guide.tsx";
import { EvaluationScreen } from "./Evaluation.tsx";

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
  acceptance: AcceptanceScreen,
  upload: UploadScreen,
  backtest: BacktestScreen,
  dataroom: DataRoomScreen,
  office: OfficeScreen,
  evaluation: EvaluationScreen,
};
