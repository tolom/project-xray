---
name: Feature request
description: Suggest a product or workflow improvement
title: "[Feature]: "
labels: [enhancement]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for suggesting an improvement to Project X-Ray.
  - type: textarea
    id: problem
    attributes:
      label: Problem
      description: What user problem should this solve?
    validations:
      required: true
  - type: textarea
    id: solution
    attributes:
      label: Proposed solution
      description: What should Project X-Ray do?
    validations:
      required: true
  - type: dropdown
    id: area
    attributes:
      label: Area
      options:
        - scanner rules
        - report output
        - UI
        - skill workflow
        - documentation
        - GitHub integration
        - CLI or automation
        - other
    validations:
      required: true
  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives considered
    validations:
      required: false
  - type: textarea
    id: notes
    attributes:
      label: Additional context
    validations:
      required: false
