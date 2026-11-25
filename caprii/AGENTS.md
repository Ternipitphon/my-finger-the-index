# Caprii development and regression lab

The user wants the companion test website updated whenever Caprii's behavior or capabilities change.

- Use the latest repository source and its declared version; do not develop from historical `downloads/` bundles.
- For browser capability changes, update `test-lab/dist/suite.js` with the target Caprii version/commit, suite version, stable case IDs, realistic Thai prompts, and observable acceptance criteria.
- Update `test-lab/dist/app.js` and relevant browser regression scenarios for the new behavior. Preserve older cases so regressions remain visible.
- Run checks appropriate to the change. For Test Lab changes, run `npm run test:lab` and `npm run test:lab-ui` when Electron/browser access is available. Explain any verification limit.
- The lab records actual field values and DOM events, not an AI statement of success. Do not add manual pass buttons or claim to identify whether a human or AI performed the action.
- Keep Test Lab source and instructions in the same branch as the Caprii change. Update `test-lab/CHANGELOG.md` and README when behavior or setup changes.
- Test Lab currently runs locally. Do not publish/deploy it unless the user explicitly authorizes publication. Uploading requested source to GitHub is separate from website deployment.
