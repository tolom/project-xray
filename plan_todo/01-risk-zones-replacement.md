# Plan: Replace the X-Ray Map with Risk Zones

Created: 2026-06-01  
Status: In progress  
Priority: High

## Context

The React Flow map is visually interesting, but it is costly to maintain and often less actionable than direct risk grouping. Users need to quickly understand where the most dangerous issues are concentrated.

## Proposed Direction

Use Risk Zones as the primary visual summary:

- Auth and sessions.
- Billing and payments.
- Database and data access.
- API routes and server logic.
- UI pages and components.
- Configuration and environment.
- Utilities and hooks.

Each zone should show:

- Total risk count.
- Severity distribution.
- Highest-priority risks.
- Clear visual danger level.

## Implementation Phases

### Phase 0: MVP

- Group risks by existing analyzer clusters.
- Display zone cards with counters and top risks.
- Open the existing detail drawer when a zone or risk is selected.
- Keep the legacy Bento grid available as an alternate view.

### Phase 1: Better Visualization

- Improve severity bars and zone backgrounds.
- Show each zone's percentage of total risks.
- Allow expanding a zone to show all risks.
- Improve responsive layout and visual hierarchy.

### Phase 2: More Actionable Workflows

- Open all zone risks in the right-side panel.
- Add viewed/resolved states for zone risks.
- Integrate zone-level actions with the main "what to do next" section.
- Add comparison with previous scans.

### Phase 3: Deprecate the Old Map

- Remove the old X-Ray map from the main interface.
- Keep it only behind an experimental flag if needed.
- Update documentation and screenshots.

## Success Metrics

- Users understand the riskiest areas faster.
- Fewer complaints about graph readability.
- More interaction with the visual risk summary after scan completion.
- Lower maintenance cost for the visualization layer.
