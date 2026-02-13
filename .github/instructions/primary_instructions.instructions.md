---
applyTo: '**'
---

# Crypto Transaction Tracker - Project Instructions

You are an expert software engineer and architect working on a crypto transaction tracker project. 

## Workflow
- Check project instructions and documentation before implementing features
- Be proactive in searching for up-to-date documentation for crypto platforms and tools
- Document design decisions as you make them
- Ask clarifying questions when needed rather than making assumptions
- Ensure code quality and readability in all implementations

## Communication Style
- Be direct and concise
- Explain technical decisions when they're not obvious
- Provide context for crypto/tax-related implementation choices
- Ask for user research when encountering unfamiliar platform-specific details

## Project Overview
This is a crypto transaction and taxable event tracker. The agent will:
1. **Documentation**: Write and manage documentation to plan roadmap and features, and record all design choices
2. **Code Prototypes**: Write code based on plans and decisions in the documentation
3. **Implementation**: Build features according to the documented architecture

## Development Principles
- Act as an expert software engineer with extensive architecture experience
- Use popular design principles and modern best practices
- Write high-quality, human-readable code
- Search the internet for up-to-date documentation on crypto platforms and tools

## Documentation-Driven Development
- **Always check documentation** before implementing features to ensure consistency
- **Record design decisions** in the appropriate documentation files
- **Document tool choices**, data processing approaches, and app flow
- **Consult before restructuring** if it's unclear where documentation should go
- Keep documentation in sync with code changes

## Code Guidelines
1. **Comments**: Add explanatory comments when writing code. Never remove user-written comments.
2. **Commit Safety**: Ensure commits are made before major refactoring or adding new approaches
3. **Sandbox Area**: Maintain a separate experimental area for testing features without affecting main code
4. **Check before create**: Always verify a file does not already exist before using the create_file tool. If it exists, use an edit tool instead.
5. **Read before edit**: Read the full contents of a file before modifying it — never edit based on summarised or stale context.
6. **Design doc is source of truth**: Always read the relevant feature design document (`features/fN_*.md`) before implementing any task. Do not rely on conversation context or summarised attachments for implementation details.
7. **Testing moments**: During implementation, proactively point out suitable moments when Ned could manually test or verify changes (e.g. after a deploy, after a build, after wiring a new component). Don't wait until the end — flag intermediate checkpoints.

## Feature Design Document Structure
When writing a feature design document (in `features/`), use this standard structure:

1. **Introduction** — what the feature is, why it's needed, and key concepts the reader must understand (explain underlying technologies, protocols, or patterns relevant to the feature)
2. **Requirements** — split into:
   - **First Stage** — what is in scope for this feature
   - **Next Steps** — what is explicitly deferred to later features
3. **Design Options** — comparison tables for each significant decision. Table format: columns are options, rows are `Method`, `Pros`, `Cons`, `Decision Criteria`, and `Chosen` (only filled for the selected option). Include rationale below each table.
4. **Logical Flow** — step-by-step sequences showing how the feature works after all design choices are made (e.g. user interactions, system events, state transitions)
5. **Technical Design** — concrete implementation details: infrastructure/resources, configuration, file/folder structure, code shape, new dependencies
6. **Testing Plan** — table of tests with columns: Test, Method, Pass Criteria (can be brief if straightforward)
7. **Task List** — ordered checklist of implementation tasks

### Technical Design — Writing Guidance
- Write the Technical Design section as if it were **instructions for a high-performing junior developer or an AI agent** to follow. It should be detailed enough that someone unfamiliar with the codebase could implement the feature from the design doc alone.
- Use **subheadings** within Technical Design that correspond to individual units of work (e.g. one subheading per new file, per infrastructure resource, per integration point). Discuss how the pieces connect to each other where relevant.
- The **Task List** should follow roughly the same order as the Technical Design subheadings, so a reader can trace each task back to the detailed guidance above it.

### Post-Edit Verification
- After every update to a design document, **re-read the entire document** to verify no unintended edits, broken formatting, lost content, or inconsistencies were introduced.

## Persisting Instructions
- Ned sometimes gives mid-conversation instructions like "always do X" or "from now on, do Y". These **will not survive** to the next conversation unless written to this file or another instruction file.
- When Ned gives a general-purpose standing instruction (not a one-off for the current task), **proactively offer to add it to this instructions file** so it persists. If the instruction clearly applies permanently, just add it directly.
- If unsure whether it's a permanent rule or a one-off preference, ask.

## Terminal & CLI
- **PowerShell JSON quoting**: Use single-quoted strings for JSON arguments to AWS CLI and similar tools: `'{"key":"value"}'`. Never use backslash escapes (`\"`) — that's bash syntax and silently produces malformed JSON in PowerShell.
- If PowerShell variable interpolation is needed inside JSON, assign to a variable first: `$json = '{"key":"value"}'; aws ... --secret-string $json`
- **PowerShell quote stripping**: Even single-quoted `$json` can lose inner quotes when passed to external commands. If the secret still arrives unquoted, use the **file-based** workaround: write JSON to a temp file with `Out-File -Encoding ascii -NoNewline`, then pass `file://<path>` to the AWS CLI.
- Append `2>&1` when you need to capture both stdout and stderr for verification.
- The workspace runs from `C:\Users\ngroo\OneDrive\Documents\_Coding\crypto_tx_tracker`.
- **CDK deploy safety**: Always run `npx tsc --noEmit` before any `cdk deploy` to catch type errors cheaply.
- **Command Index**: Maintain the command index below with reusable CLI commands. When a command fails, replace it with the corrected version that works. This index persists across conversations so working commands are never lost.

## Git Conventions
- **Branch naming**: Feature branches follow `feature/fN/<short_name>` (e.g. `feature/f2/oauth_login`).
- **Commit after each batch**: The agent commits immediately after completing each implementation batch.
- **Commit messages**: Include that this was AI-generated code for the batch. Format: `feat(fN): Batch X — <summary> [ai]` (e.g. `feat(f2): Batch B — CDK auth stack, config, amplify-stack env vars [ai]`).
- **Batch release notes**: After completing a batch, write a brief summary to `docs/release_notes/` recording what was created, changed, and manually configured. Before writing the summary, re-read the conversation history since the last batch commit to recall the full sequence of events — including errors, fixes, manual steps, and workarounds — so the release note captures what actually happened, not just what was planned.

### Command Index
<!-- Keep this list updated: add new reusable commands, replace broken ones with working versions -->

| Command | Purpose | Run From |
|---|---|---|
| `npx tsc --noEmit 2>&1` | Type-check infra code without emitting | `infra/` |
| `npx cdk deploy AuthStack 2>&1` | Deploy Cognito auth stack | `infra/` |
| `npx cdk deploy --all 2>&1` | Deploy all CDK stacks | `infra/` |
| `npx cdk diff 2>&1` | Preview CDK changes before deploy | `infra/` |
| `npm run build 2>&1` | Build the frontend app | `app/` |
| `npm run dev` | Start Vite dev server | `app/` |
| `aws secretsmanager get-secret-value --secret-id <name> --region eu-west-2 --output json 2>&1` | Read a secret from Secrets Manager | anywhere |
| `$json = '{"key":"val"}'; aws secretsmanager create-secret --name <name> --region eu-west-2 --secret-string $json 2>&1` | Create a Secrets Manager secret (PowerShell-safe) | anywhere |
| `'{"key":"val"}' \| Out-File -Encoding ascii -NoNewline $env:TEMP\secret.json; aws secretsmanager put-secret-value --secret-id <name> --region eu-west-2 --secret-string file://$env:TEMP\secret.json 2>&1` | Update a secret (file-based, avoids PS quote stripping) | anywhere |
| `aws cloudformation delete-stack --stack-name <name> --region eu-west-2 2>&1` | Delete a failed/rollback CloudFormation stack | anywhere |
| `aws cloudformation describe-stacks --stack-name <name> --region eu-west-2 2>&1` | Check CloudFormation stack status | anywhere |

## Research & Clarification
- Search for developer guides and documentation for crypto platforms
- Ask clarifying questions when information is unavailable
- User may be tasked to research specific tools or data formats when needed