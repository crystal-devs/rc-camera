// constants/templates.ts
//
// Template-driven progressive disclosure. Pro structure unlocks by template —
// never by default — so a first-time birthday host never meets a concept they
// don't need (docs/ROADMAP.md positioning guardrail).

export type EventTemplate =
  | 'wedding'
  | 'birthday'
  | 'concert'
  | 'corporate'
  | 'vacation'
  | 'custom';

/**
 * Templates whose events are made of multiple functions (haldi / sangeet /
 * wedding / reception), so the host sees the Functions manager and guests get
 * per-function sections.
 *
 * Only weddings today (ROADMAP Phase 1). Casual events stay single-gallery:
 * their media simply carries sub_event_id = null.
 */
const TEMPLATES_WITH_SUB_EVENTS: ReadonlySet<string> = new Set<EventTemplate>(['wedding']);

/** True when this template should surface the multi-function (sub-event) UI. */
export const templateSurfacesSubEvents = (template?: string | null): boolean =>
  !!template && TEMPLATES_WITH_SUB_EVENTS.has(template);
