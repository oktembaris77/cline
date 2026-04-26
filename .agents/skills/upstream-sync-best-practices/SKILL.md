---
name: upstream-sync-best-practices
description: Best practices for developing on a fork and syncing with the upstream (original) repository to minimize merge conflicts. Use this when writing code or managing branches to ensure the project remains up-to-date and maintainable.
---

# Upstream Sync Best Practices

This skill provides guidelines for developing on a forked repository while maintaining synchronization with the original (upstream) project. Following these rules minimizes merge conflicts and ensures a clean development workflow.

## Core Rules

### 1. Branching Strategy
- **NEVER** work directly on the `main` or `master` branch.
- Keep the `main` branch clean and synchronized with `upstream/main`.
- Always create a **feature branch** for new work:
  ```powershell
  git checkout main
  git pull upstream main
  git checkout -b feature/your-feature-name
  ```

### 2. Modularity & New Files
- **Prefer adding new files** over modifying existing core files.
- Place custom logic in a dedicated directory (e.g., `src/custom/` or similar) to isolate changes.
- **Minimize core modifications**: If you must modify a core file, try to keep the change to a minimum (e.g., call a function from your new file or a helper instead of embedding long logic blocks). This makes it easier to spot and resolve conflicts.

### 3. Code Tagging & Documentation
- Mark custom modifications in core files with clear comment tags:
  ```typescript
  // --- CUSTOM START: [Feature Name] ---
  customLogic();
  // --- CUSTOM END ---
  ```
- This helps identify changes during manual conflict resolution.

### 4. Frequent Rebase
- Regularly synchronize your feature branch with the latest changes from `upstream`.
- Use `rebase` instead of `merge` to keep a clean, linear history:
  ```powershell
  git checkout main
  git fetch upstream
  git merge upstream/main
  git checkout feature/your-feature-name
  git rebase main
  ```

### 5. Minimal Formatting Changes
- Avoid global refactoring, linting, or formatting changes in core files that you didn't create.
- Stick to the project's existing coding style in shared files to avoid "noise" in diffs.

## Workflow Summary
1. Update local `main` from `upstream/main`.
2. Create a feature branch.
3. Write modular code (new files where possible).
4. Tag modifications in core files.
5. Rebase frequently.
6. Push to `origin` (your fork) and create PRs from the feature branch.
