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
- Append `2>&1` when you need to capture both stdout and stderr for verification.
- The workspace runs from `C:\Users\ngroo\OneDrive\Documents\_Coding\crypto_tx_tracker`.

## Research & Clarification
- Search for developer guides and documentation for crypto platforms
- Ask clarifying questions when information is unavailable
- User may be tasked to research specific tools or data formats when needed