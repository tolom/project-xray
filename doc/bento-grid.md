# Dual View System

Project X-Ray originally used two complementary result views: a Bento dashboard and an X-Ray map.

## Bento Dashboard

The Bento dashboard is the primary analytical view. It should emphasize:

- Health score.
- Top risks.
- Rule-level breakdown.
- Risk cards by architectural area.
- Direct actions such as opening risk details, muting files, and re-scanning selected files.

## X-Ray Map

The X-Ray map is a visual architecture view built with React Flow. It groups files into high-level layers such as UI, API, Auth, Billing, Data, and Config.

The map is useful for exploration, but it is more expensive to maintain than the risk-zone view and can be harder for non-technical users to interpret.

## Shared Interaction Model

Both views should open the same detail drawer for a selected risk. This avoids duplicated behavior and keeps repair prompt generation centralized.

## Current Direction

Risk Zones are now the preferred visual summary because they are easier to scan, more actionable, and less costly to maintain than a graph-heavy interface.
