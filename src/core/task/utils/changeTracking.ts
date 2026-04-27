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
	if (!taskState.originalContents.has(filePath)) {
		taskState.originalContents.set(filePath, safeOldContent)
	}
	// --- BACKUP END ---

	// Always compare against the original content to get a cumulative task diff
	const originalContent = taskState.originalContents.get(filePath) || ""
	const diffStats = computeLineDiffStats(originalContent, newContent)

	let linesAdded = diffStats.linesAdded
	// Handle new files where diff might return 0 but content exists
	if (originalContent === "" && linesAdded === 0 && newContent.length > 0) {
		linesAdded = newContent.split(/\r?\n/).length
	}

	// --- CUSTOM START: hunks ---
	// Find all hunks and their stats
	const { hunks, fullDiff } = computeHunks(originalContent, newContent)
	// --- CUSTOM END ---

	taskState.fileChanges.set(relPath, {
		fullPath: filePath,
		added: linesAdded + diffStats.linesChanged,
		changed: 0,
		deleted: diffStats.linesDeleted + diffStats.linesChanged,
		hunks,
		fullDiff,
	})
}

interface HunkInfo {
	id: string
	startLine: number
	added: number
	deleted: number
	status: "pending" | "approved" | "rejected"
	isApplied?: boolean
	oldValue: string
	newValue: string
}

/**
 * Compute hunks with their stats.
 */
function computeHunks(before: string, after: string): { hunks: HunkInfo[]; fullDiff: diff.Change[] } {
	const normBefore = before ? before.replace(/\r\n/g, "\n") : ""
	const normAfter = after ? after.replace(/\r\n/g, "\n") : ""

	const changes = diff.diffLines(normBefore, normAfter)
	const hunks: HunkInfo[] = []

	let currentLineAfter = 1
	let currentHunk: { startLine: number; added: number; deleted: number; oldValue: string; newValue: string } | null = null

	for (const change of changes) {
		if (change.added || change.removed) {
			if (!currentHunk) {
				currentHunk = { startLine: currentLineAfter, added: 0, deleted: 0, oldValue: "", newValue: "" }
			}

			const lines = change.value.split("\n")
			const count = change.value.endsWith("\n") ? lines.length - 1 : lines.length

			if (change.added) {
				currentHunk.added += count
				currentHunk.newValue += change.value
				currentLineAfter += count
			} else {
				currentHunk.deleted += count
				currentHunk.oldValue += change.value
			}
		} else {
			// Unchanged block
			if (currentHunk) {
				hunks.push({
					id: `hunk-${currentHunk.startLine}-${hunks.length}`,
					startLine: currentHunk.startLine,
					added: currentHunk.added,
					deleted: currentHunk.deleted,
					status: "pending",
					oldValue: currentHunk.oldValue,
					newValue: currentHunk.newValue,
				})
				currentHunk = null
			}

			const lines = change.value.split("\n")
			const count = change.value.endsWith("\n") ? lines.length - 1 : lines.length
			currentLineAfter += count
		}
	}

	// Final hunk if file ends with changes
	if (currentHunk) {
		hunks.push({
			id: `hunk-${currentHunk.startLine}-${hunks.length}`,
			startLine: currentHunk.startLine,
			added: currentHunk.added,
			deleted: currentHunk.deleted,
			status: "pending",
			oldValue: currentHunk.oldValue,
			newValue: currentHunk.newValue,
		})
	}

	return { hunks, fullDiff: changes }
}
