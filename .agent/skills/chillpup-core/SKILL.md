---
name: chillpup-core
description: Core product rules, safety boundaries, and UX guidelines for ChillPup.
triggers:
  - always_active: true
  - files: ["mobile/**/*", "src/**/*"]
---

# Antigravity Skills / Working Rules for ChillPup

## Role

You are working on ChillPup, a React Native / Expo mobile app for short, owner-guided routines for stressful dog moments.

Your job is to implement narrowly scoped product changes safely, without expanding the scope, inventing features, or turning small UX changes into infrastructure projects.

## Product Positioning

ChillPup is not a veterinary app, diagnostic tool, emergency tool, medication advisor, or replacement for a veterinarian, veterinary behaviorist, or certified trainer.

Use this safety formula:

Owner records. App organizes. Vet interprets.

Allowed product promise:

ChillPup helps owners follow short, gentle, low-pressure routines and observe owner-reported stress signs over time.

Do not claim that ChillPup diagnoses, treats, cures, prevents, detects, or clinically improves anxiety, phobia, pain, aggression, CCD, or any medical/behavioral disorder.

## Safety Boundaries

Never write user-facing copy that implies:

* diagnosis
* treatment
* cure
* clinical improvement
* medical interpretation
* medication guidance
* emergency triage
* “the app detected”
* “the app diagnosed”
* “your dog is improving”
* “your dog is getting worse”

Use owner-reported wording:

* “owner-reported signs”
* “stress signs”
* “signs look easier”
* “signs look stronger”
* “recent check-ins”
* “not enough data yet”

For medical red flags, severe distress, collapse, breathing trouble, repeated vomiting/diarrhea, seizures, severe pain, self-injury, aggression, or escape attempts near danger, the app must stop the routine path and recommend appropriate professional support.

## Scope Discipline

Do not expand scope without explicit approval.

If the task is about one routine, do not redesign the whole app.

If the task is about local UX, do not add Firebase, Firestore, Cloud Functions, AI analysis, analytics, push notifications, account flows, or sync.

If Firebase sync is mentioned as P2, treat it as future work only unless explicitly told to implement it now.

Prefer small, testable changes.

Before implementing, identify:

* files to modify
* files to create
* user-visible behavior changed
* tests affected
* scope risks

## Token / Quota Discipline

Avoid unnecessary broad code exploration.

First search for exact file names or known symbols.

Prefer targeted reads over opening many large files.

Do not repeatedly re-read unchanged files.

Do not regenerate large plans after every small change.

When code context is missing, ask for the specific file or search narrowly.

Before making large changes, summarize the intended patch briefly.

## Architecture Rules

Prefer existing app architecture.

Do not introduce new libraries unless necessary.

Do not add charting libraries for simple sparklines. Use lightweight React Native views or SVG if already available.

Do not add new backend services unless the scope explicitly requires them.

For local product logic, prefer app services under `mobile/services`.

For app content, prefer `mobile/appContent`.

For shared types, use `mobile/types`.

Avoid turning `sessionService.ts` into a God service. Prefer separating:

* session history CRUD
* progress trend calculation
* content definitions
* future sync concerns

## Firebase Rules

Current P1 product work should remain local-first.

Allowed in P1:

* stable IDs
* schemaVersion fields
* sync-friendly local data shapes
* createdAt / updatedAt fields where useful

Not allowed in P1 unless explicitly approved:

* Firestore reads
* Firestore writes
* syncQueueService
* cloudSyncService
* firestorePetRepository
* Cloud Functions
* security rules
* AI analysis
* server-side trend calculation

Future Firebase Backup & Restore scope may include:

* pet profile sync
* session history sync
* Outdoor Confidence state sync
* restore after login on a new phone
* offline-first sync queue
* Firestore security rules

## Routine-Specific Check-Ins

Do not use one global anxiety sign list for every routine.

Use routine-specific check-in profiles.

General severe signs may be reused globally.

Outdoor Confidence Reset must use outdoor-specific stress signs, such as:

* freezing at the edge
* pulling back / turning home
* scanning outside
* trembling / shaking
* panting
* refusing treats
* trying to hide
* whining / barking
* tucked tail / low body
* unable to recover after returning
* other

Outdoor Confidence Reset should not ask generic positive signs such as:

* Fell Asleep
* Resting / Lying Down
* Settled Nearby

For Outdoor Confidence Reset, use the milestone prompt instead:

“What did your dog manage today?”

## Outdoor Confidence Reset Rules

This routine is threshold practice, not a full walk.

It should support tiny, low-pressure steps near:

* door
* hallway
* porch
* yard
* building exit
* quiet outdoor edge

It must not encourage forcing, dragging, blocking retreat, or pushing through panic.

Retreating calmly should count as useful practice, not failure.

The routine must clearly explain how to make setup easier:

* move farther from the door or exit
* practice with the door closed first
* open the door only a crack
* stay inside and only look toward the exit
* choose a quieter time of day
* use a calmer hallway, porch, yard, or building exit
* shorten the session to 10–20 seconds
* end while the dog can still recover

## Outdoor Milestones

Milestones are owner-confirmed. They are not clinical results.

Unlocking a milestone means “available to try”, not “fixed”, “treated”, or “cured”.

Milestone options:

* Stayed calm near the door
* Handled the door opening
* Took one calm step
* Paused briefly outside
* Walked a few calm steps away
* Managed around 100 steps
* Managed an easy 10-minute walk
* None of these yet

After milestone selection, show clear next-step copy.

Do not close immediately after saving without explaining what comes next.

Use easier-step guidance when stress signs are stronger.

## Stress Signs Trend

Component title:

Stress Signs Trend

Never use:

* Progress Toward Calm
* Anxiety Score
* Clinical Anxiety Trend
* Treatment Progress

The chart should show recent sessions, not calendar days.

Use last 5 to 7 check-ins.

Use after-check-in score when available, otherwise before-check-in score.

Lower score means fewer owner-reported stress signs.

Higher score means stronger owner-reported stress signs.

Statuses:

* not_enough_data
* easing
* same
* mixed
* increased
* severe

User-facing labels:

* Not enough data yet
* Signs look easier
* About the same
* Mixed pattern
* Signs look stronger
* Strong signs noted

Do not call this diagnosis, treatment progress, clinical progress, or anxiety score.

## Audio Policy

Outdoor Confidence Reset must not autoplay background audio.

Audio controls should be hidden for Outdoor Confidence Reset.

Do not add white noise or brown noise assets unless explicitly provided.

Unsupported future modes may be left as TODO comments only.

## Guided Session UX

The guided session player must support:

* Previous Step
* Pause / Resume
* Next Step

Previous Step should be disabled on the first step.

Going backward should not duplicate saved check-in data.

Outdoor sessions should hide audio controls when sound policy says none.

Do not show the green breathing circle for Outdoor Confidence Reset unless explicitly requested.

The green circle may remain only for routines where a calm visual makes sense, such as Daily Calm Reset.

## Modal / Button UX

Button labels must be horizontally centered.

Use:

* `alignItems: 'center'`
* `justifyContent: 'center'`
* `textAlign: 'center'`

Milestone modal must be usable on small Android screens.

Requirements:

* show at least 3 milestone options where possible
* use ScrollView for long option lists
* show scroll indicator
* keep Save button accessible
* do not let Save button cover list items
* reduce oversized icon/header spacing
* disable Save until an option is selected
* show next-step guidance after saving

Do not make the user guess that the milestone list scrolls.

## Easier Options CTA

Do not make “Use Easier Routine” or “See easier options” simply close a modal.

## Test Fixing Discipline

When tests fail, do not immediately rewrite test expectations.

First determine whether the failure is caused by:

1. A real product regression.
2. A legitimate UI/copy change that requires test updates.
3. A broken mock or missing mocked method.
4. A timing / async / act issue.
5. A brittle test query.

Only update tests when the product behavior intentionally changed.

Do not weaken tests just to make them pass.

If changing a test expectation, explain why the old expectation is no longer valid.

Avoid changes like replacing a regex assertion with an exact string unless there is a clear reason.

## Debugging Discipline

Temporary debug logs are allowed only when needed.

Any temporary `console.log`, debug marker, or inspection code must be removed before finalizing the task.

Do not leave debug output in production code or committed tests.

If a debug log was added, explicitly confirm it was removed in the final report.

## Test Execution Discipline

Do not repeatedly run the entire Jest suite after every small edit.

Preferred order:

1. Run the most relevant failing test file.
2. Fix the specific failure.
3. Re-run that test file.
4. Run related tests.
5. Run the full suite once near the end.

Use full `yarn test` only at verification milestones, not after every small patch.

## Code Exploration Discipline

Do not read broad parts of the repository unless necessary.

Prefer targeted search by exact symbols, file names, or failing stack traces.

Before reading many files, explain why each file is needed.

Do not inspect unrelated files just because they exist.

## Artifact Discipline

Do not create or update task.md, walkthrough.md or similar artifact files unless explicitly requested.

For normal implementation tasks, provide a concise final summary instead.

Only create persistent documentation when the user asks for it or when the task explicitly requires an artifact.

## Existing Test Compatibility

When changing shared UI such as DashboardScreen, GuidedSessionScreen, or SessionPreviewScreen, check existing tests for assumptions that may be affected.

If old tests fail because the intended UI changed, update them narrowly.

Do not make broad compatibility hacks just to support outdated mocks.

If mock session data lacks new fields, prefer safe defaults in production code only when that behavior is also useful in real app usage.

## Mandatory Report For Test Changes

Whenever modifying a test file, report:

- which test was changed
- old expectation
- new expectation
- reason for the change
- whether this reflects intentional product behavior or only a mock/test stability fix

Do not modify tests silently.

## React Navigation Discipline

Do not use `navigation.replace()` as a way to “go back” to an existing screen.

`replace()` removes the current route and inserts a new route. If the target screen already exists below the current screen, this can create duplicate screens in the stack.

Example bad flow:

[Dashboard] -> [SessionPreview] -> [GuidedSession]

Calling:

navigation.replace('SessionPreview')

creates:

[Dashboard] -> [SessionPreview] -> [SessionPreview]

This causes repeated Back presses and stacked duplicate previews.

Use navigation methods by intent:

- Return to the previous screen: `navigation.goBack()`
- Return to Dashboard/root: `navigation.popToTop()` or the app’s existing Dashboard navigation pattern
- Open Paywall from preview: `navigation.navigate('Paywall', params)`
- Start guided session from preview: `navigation.navigate('GuidedSession', params)`
- Update an existing screen with params: prefer `navigation.navigate('ExistingScreen', params)` only after verifying it does not create duplicates in this navigator
- Replace only when the current screen should truly be removed and replaced with a new route

Never navigate from `SessionPreviewScreen` to another `SessionPreviewScreen` for the same session unless there is an explicit, tested reason.

Never use `replace('Dashboard')` from a nested session flow if it creates `[Dashboard] -> [SessionPreview] -> [Dashboard]`.

---