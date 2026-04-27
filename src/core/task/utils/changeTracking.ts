import type { TaskState } from "../TaskState"
import { computeLineDiffStats } from "../tools/utils/lineDiffStats"

/**
 * Records file change statistics in the task state.
 * This helper minimizes the footprint in core tool handlers.
 *
 * --- CUSTOM FEATURE: Change Summary ---
 */
export function recordFileChange(
	taskState: TaskState,
	relPath: string,
	oldContent: string | undefined | null,
	newContent: string,
): void {
	const safeOldContent = oldContent || ""
	const diffStats = computeLineDiffStats(safeOldContent, newContent)

	// --- BACKUP START ---
	// If this is the first time we see this file, backup the original content
	if (!taskState.originalContents.has(relPath)) {
		taskState.originalContents.set(relPath, safeOldContent)
	}
	// --- BACKUP END ---

	const currentChanges = taskState.fileChanges.get(relPath) || { added: 0, changed: 0, deleted: 0 }

	let linesAdded = diffStats.linesAdded
	// Handle new files where diff might return 0 but content exists
	if (safeOldContent === "" && linesAdded === 0 && newContent.length > 0) {
		linesAdded = newContent.split(/\r?\n/).length
	}

	taskState.fileChanges.set(relPath, {
		added: currentChanges.added + linesAdded + diffStats.linesChanged,
		changed: 0, // No more yellow "~" stats
		deleted: currentChanges.deleted + diffStats.linesDeleted + diffStats.linesChanged,
	})
}
