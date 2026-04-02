# Meeting Minutes Operational Output Design

## Context

The current AI meeting minutes flow turns a transcript into a readable summary with `title`, `date`, `participants`, `agenda`, `summary`, `decisions`, and `actionItems`. That shape is a good baseline for demo and quick review, but it is still optimized for recap rather than operational follow-through.

This design updates the output contract and the UI so the generated minutes work first as an operational follow-up tool while remaining readable as meeting notes.

## Goals

- Keep the current minutes flow lightweight and AI-friendly.
- Make action items the primary output of the page.
- Surface incomplete extraction clearly so users know what still needs confirmation.
- Stay close to the current implementation to minimize risk.

## Non-Goals

- Building a persistent minutes repository.
- Converting action items into stored tasks in this iteration.
- Adding new AI modes or multi-step approvals.

## Recommended Output Contract

```json
{
  "title": "...",
  "date": "YYYY-MM-DD",
  "participants": ["..."],
  "agenda": ["..."],
  "summary": "...",
  "keyPoints": ["..."],
  "decisions": ["..."],
  "openIssues": ["..."],
  "actionItems": [
    {
      "task": "...",
      "pic": "...",
      "ownerUnit": "...",
      "deadline": "YYYY-MM-DD",
      "priority": "High|Medium|Low",
      "status": "open|on_track|blocked",
      "notes": "...",
      "relatedDecision": "...",
      "needsConfirmation": ["pic", "deadline"]
    }
  ],
  "nextCheckIn": "YYYY-MM-DD"
}
```

## Field Rules

### Required

- `title`
- `date`
- `summary`
- `actionItems`

### Strongly recommended

- `participants`
- `keyPoints`
- `decisions`
- `openIssues`

### Optional

- `agenda`
- `ownerUnit`
- `notes`
- `relatedDecision`
- `nextCheckIn`

## Fallback Rules

- If `task` is not clear, do not emit an action item.
- If `pic` is missing, use an empty string and add `"pic"` to `needsConfirmation`.
- If `deadline` is missing, use an empty string and add `"deadline"` to `needsConfirmation`.
- If `priority` is unclear, default to `Medium`.
- If `status` is unclear, default to `open`.
- If no explicit decisions are found, keep `decisions` empty instead of inventing them.
- If enough context exists, emit 3-7 `keyPoints` that summarize the most important discussion bullets.
- If no valid action items are found, return an empty list and rely on `summary` plus `openIssues`.

## Backend Design

- Extend `entity.ActionItem` with `ownerUnit`, `status`, `notes`, `relatedDecision`, and `needsConfirmation`.
- Extend `entity.MeetingMinutes` with `keyPoints`, `openIssues`, and `nextCheckIn`.
- Update the meeting-minutes AI prompt to request the new contract and the fallback behavior above.
- Preserve current endpoint shape so frontend integration remains stable.

## Frontend Design

- Keep the existing transcript input flow.
- Reorder the output view so `actionItems` is the main block.
- Add a compact operational summary above the list:
  - total action items
  - items missing PIC
  - items missing deadline
  - high-priority items
- Add a `keyPoints` section near the top so users can scan what was discussed before diving into execution details.
- Show badges for:
  - `Perlu PIC`
  - `Perlu deadline`
  - `Siap ditindaklanjuti`
  - item `priority`
  - item `status`
- Move `participants` and `agenda` below the operational content.
- Add an `openIssues` section between action items and decisions.

## Error Handling

- Keep existing empty states when AI does not return sections.
- Avoid presenting invented data as certain facts.
- Make incomplete extraction visible instead of silently hiding it.

## Testing

- Backend: add a unit test that verifies the minutes response struct accepts the expanded schema from the AI prompt.
- Frontend: verify the page builds with the new type shape and the UI renders missing-field badges correctly.
- End-to-end in local dev: paste a transcript with complete and incomplete action items to confirm ordering and fallback labels.

## Rollout Notes

- This is backward-compatible if the model omits new fields because the frontend will default empty arrays and strings.
- The main user-facing change is stronger action follow-up visibility, not a new workflow.
