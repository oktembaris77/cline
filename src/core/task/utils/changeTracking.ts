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

	// --- BACKUP START ---
	// If this is the first time we see this file, backup the original content
	if (!taskState.originalContents.has(relPath)) {
		taskState.originalContents.set(relPath, safeOldContent)
	}
	// --- BACKUP END ---

	// Always compare against the original content to get a cumulative task diff
	const originalContent = taskState.originalContents.get(relPath) || ""
	const diffStats = computeLineDiffStats(originalContent, newContent)

	let linesAdded = diffStats.linesAdded
	// Handle new files where diff might return 0 but content exists
	if (originalContent === "" && linesAdded === 0 && newContent.length > 0) {
		linesAdded = newContent.split(/\r?\n/).length
	}

	taskState.fileChanges.set(relPath, {
		added: linesAdded + diffStats.linesChanged,
		changed: 0, // No more yellow "~" stats
		deleted: diffStats.linesDeleted + diffStats.linesChanged,
	})
}
