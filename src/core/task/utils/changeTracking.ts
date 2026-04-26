import type { TaskState } from "../TaskState"
import { computeLineDiffStats } from "../tools/utils/lineDiffStats"

/**
 * Records file change statistics in the task state.
 * This helper minimizes the footprint in core tool handlers.
 *
 * --- CUSTOM FEATURE: Change Summary ---
 */
export function recordFileChange(taskState: TaskState, relPath: string, oldContent: string, newContent: string): void {
	const diffStats = computeLineDiffStats(oldContent, newContent)
	const currentChanges = taskState.fileChanges.get(relPath) || { added: 0, changed: 0, deleted: 0 }

	taskState.fileChanges.set(relPath, {
		added: currentChanges.added + diffStats.linesAdded,
		changed: currentChanges.changed + diffStats.linesChanged,
		deleted: currentChanges.deleted + diffStats.linesDeleted,
	})
}
