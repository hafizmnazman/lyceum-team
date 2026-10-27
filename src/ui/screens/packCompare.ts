// The records the before and after views compare (depth plan Section 6.2): a course version and the one it replaced, and a
// session's pack under either, built at one moment with the course's brand so two packs differ only where the versions do.

import type { AppState } from "../../app/store.ts";
import { previousVersionOf } from "../../lib/decisions.ts";
import { brandFor, packUnderVersion, type DeckSpec } from "../../lib/slides.ts";
import type { CLO, CourseDefinition, Subject, SubjectVersion, TeachingSession } from "../../types.ts";

export type VersionLike = { cloSnapshot: CLO[]; definition?: CourseDefinition | null };

/** A maker of a session's pack under any version of its course. */
export function packMaker(state: AppState, subject: Subject, markData: string | null, at: string) {
  const evidence = { sources: state.evidenceSources, mentions: state.skillMentions, mappings: state.skillMappings };
  return (session: TeachingSession, version: VersionLike): DeckSpec =>
    packUnderVersion(subject, session, version, evidence, state.people, at, brandFor(state.institution, version.definition ?? null, subject, session.week, markData));
}

/** The version a version replaced, read from the workspace's records (lib/decisions.ts previousVersionOf). */
export function previousVersion(state: AppState, version: SubjectVersion): SubjectVersion | null {
  return previousVersionOf(version, state.subjectVersions, state.events, state.curriculumDrafts);
}
