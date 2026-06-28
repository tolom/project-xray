---
name: Bug report
description: Report a bug in Project X-Ray
title: "[Bug]: "
labels: [bug]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for reporting a bug. Please do not include private repository contents or sensitive data.
  - type: input
    id: version
    attributes:
      label: Version or commit
      description: Which version, branch, or commit did you use?
    validations:
      required: false
  - type: textarea
    id: summary
    attributes:
      label: Summary
      description: What happened?
    validations:
      required: true
  - type: textarea
    id: steps
    attributes:
      label: Steps to reproduce
      description: Keep the reproduction minimal and safe.
      placeholder: |
        1. Open ...
        2. Scan ...
        3. See ...
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: Expected behavior
    validations:
      required: true
  - type: textarea
    id: actual
    attributes:
      label: Actual behavior
    validations:
      required: true
  - type: textarea
    id: environment
    attributes:
      label: Environment
      description: Browser, OS, Node.js version, deployment environment.
    validations:
      required: false
  - type: textarea
    id: notes
    attributes:
      label: Additional notes
    validations:
      required: false
