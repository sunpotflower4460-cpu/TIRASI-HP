# BudouX Japanese phrase segmentation

Copyright 2021 Google LLC. Licensed under Apache License 2.0; full text is in
[`public/licenses/BudouX-Apache-2.0.txt`](../../../public/licenses/BudouX-Apache-2.0.txt).

Source: [google/budoux v0.10.4](https://github.com/google/budoux/tree/v0.10.4).

- `parser.ts`: original `javascript/src/parser.ts`, unmodified.
- `ja.ts`: the Japanese model from the published `budoux@0.10.4` package's
  `module/data/models/ja.js`. A source attribution header is added and the stale
  source-map comment is removed. The model values are unchanged.

Only the pure parser and Japanese model are included. The npm entry point also
brought unused DOM processors and other language models into the application
bundle during the measured Vite build (719.64 kB versus 347.73 kB before BudouX).
This small vendored subset keeps segmentation local without shipping that code.
No HTML is processed and no text is transmitted to a service. Upgrades should
copy from a pinned upstream release, preserve this notice and rerun the typography
unit tests and flyer output matrix.
