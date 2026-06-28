---
name: Rule request
description: Suggest a new Project X-Ray scanner rule
title: "[Rule]: "
labels: [rule-request]
body:
  - type: markdown
    attributes:
      value: |
        Suggest a deterministic rule that helps users find fragile zones in AI-built products before launch.
  - type: textarea
    id: pattern
    attributes:
      label: Fragility pattern
      description: What recurring AI-built app failure mode should Project X-Ray detect?
      placeholder: Example: A file combines route UI, billing state, and database writes.
    validations:
      required: true
  - type: textarea
    id: why
    attributes:
      label: Why it matters
      description: Explain the technical and product impact.
    validations:
      required: true
  - type: dropdown
    id: severity
    attributes:
      label: Suggested severity
      options:
        - low
        - medium
        - high
        - critical
    validations:
      required: true
  - type: textarea
    id: evidence
    attributes:
      label: Evidence strategy
      description: What file names, code patterns, imports, or structural signals could indicate this issue?
    validations:
      required: true
  - type: textarea
    id: false_positives
    attributes:
      label: False-positive risks
      description: When should the scanner avoid or downgrade this finding?
    validations:
      required: false
  - type: textarea
    id: output
    attributes:
      label: Suggested user-facing output
      description: Optional message, impact, and suggested action text.
    validations:
      required: false
