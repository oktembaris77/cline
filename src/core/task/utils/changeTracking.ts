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

	// --- CUSTOM START: changedLineNumbers ---
	// Find all line numbers where changes occur (1-based)
	const changedLineNumbers = computeChangedLineNumbers(originalContent, newContent)
	// --- CUSTOM END ---

	taskState.fileChanges.set(relPath, {
		added: linesAdded + diffStats.linesChanged,
		changed: 0, // No more yellow "~" stats
		deleted: diffStats.linesDeleted + diffStats.linesChanged,
		changedLineNumbers,
	})
}

/**
 * Compute the 1-based line numbers where changes begin.
 * For new files, returns [1].
 */
function computeChangedLineNumbers(before: string, after: string): number[] {
	if (!before) return [1]

	const normBefore = before.replace(/\r\n/g, "\n")
	const normAfter = after.replace(/\r\n/g, "\n")

	const changes = diff.diffLines(normBefore, normAfter)

	const lineNumbers: number[] = []
	let lineNumber = 1
	let inHunk = false

	for (const change of changes) {
		if (change.removed || change.added) {
			if (!inHunk) {
				lineNumbers.push(lineNumber)
				inHunk = true
			}
		} else {
			inHunk = false
		}

		// Count unchanged lines to track position
		// Also count removed lines because we want the position in the "before" state
		// for deletions, but "after" state for additions?
		// Actually, VSCode selection usually refers to the CURRENT state of the file.
		// So we should track line numbers in the AFTER state.
		if (!change.removed) {
			const lineCount = change.value.split("\n").length
			const actualLines = change.value.endsWith("\n") ? lineCount - 1 : lineCount
			lineNumber += actualLines
		}
	}

	return lineNumbers.length > 0 ? lineNumbers : [1]
}
