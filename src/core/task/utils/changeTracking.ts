import * as diff from "diff"
import { asRelativePath } from "../../../utils/path"
import type { TaskState } from "../TaskState"
import { computeLineDiffStats } from "../tools/utils/lineDiffStats"

/**
 * Records file change statistics in the task state.
 * This helper minimizes the footprint in core tool handlers.
 *
 * --- CUSTOM FEATURE: Change Summary ---
 */
export async function recordFileChange(
	taskState: TaskState,
	filePath: string,
	oldContent: string | undefined | null,
	newContent: string,
): Promise<void> {
	const relPath = (await asRelativePath(filePath)).toPosix()
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

	// --- CUSTOM START: firstChangedLine ---
	// Find the first line that changed (1-based line number)
	const firstChangedLine = computeFirstChangedLine(originalContent, newContent)
	// --- CUSTOM END ---

	taskState.fileChanges.set(relPath, {
		added: linesAdded + diffStats.linesChanged,
		changed: 0, // No more yellow "~" stats
		deleted: diffStats.linesDeleted + diffStats.linesChanged,
		firstChangedLine,
	})
}

/**
 * Compute the 1-based line number of the first changed line.
 * Returns 1 as fallback for new files.
 */
function computeFirstChangedLine(before: string, after: string): number {
	if (!before) return 1

	const normBefore = before.replace(/\r\n/g, "\n")
	const normAfter = after.replace(/\r\n/g, "\n")

	const changes = diff.diffLines(normBefore, normAfter)

	let lineNumber = 1
	for (const change of changes) {
		if (change.removed || change.added) {
			return lineNumber
		}
		// Count unchanged lines to track position
		if (!change.added) {
			const lineCount = change.value.split("\n").length
			// diffLines includes a trailing empty string from split if value ends with \n
			const actualLines = change.value.endsWith("\n") ? lineCount - 1 : lineCount
			lineNumber += actualLines
		}
	}

	return 1
}
