import * as vscode from "vscode"
import { ShowTextDocumentRequest, TextEditorInfo } from "@/shared/proto/host/window"
import { arePathsEqual } from "@/utils/path"

export async function showTextDocument(request: ShowTextDocumentRequest): Promise<TextEditorInfo> {
	// --- CUSTOM START: Line navigation ---
	// Parse optional line number encoded as "path\0lineNumber"
	let filePath = request.path
	let revealLine: number | undefined
	const nullIdx = request.path.indexOf("\0")
	if (nullIdx !== -1) {
		filePath = request.path.substring(0, nullIdx)
		const lineStr = request.path.substring(nullIdx + 1)
		const parsed = Number.parseInt(lineStr, 10)
		if (!isNaN(parsed) && parsed > 0) {
			revealLine = parsed
		}
	}
	// --- CUSTOM END ---

	// Convert file path to URI
	const uri = vscode.Uri.file(filePath)

	// Check if the document is already open in a tab group that's not in the active editor's column.
	//  If it is, then close it (if not dirty) so that we don't duplicate tabs
	try {
		for (const group of vscode.window.tabGroups.all) {
			const existingTab = group.tabs.find(
				(tab) => tab.input instanceof vscode.TabInputText && arePathsEqual(tab.input.uri.fsPath, uri.fsPath),
			)
			if (existingTab) {
				const activeColumn = vscode.window.activeTextEditor?.viewColumn
				const tabColumn = vscode.window.tabGroups.all.find((group) => group.tabs.includes(existingTab))?.viewColumn
				if (activeColumn && activeColumn !== tabColumn && !existingTab.isDirty) {
					await vscode.window.tabGroups.close(existingTab)
				}
				break
			}
		}
	} catch {} // not essential, sometimes tab operations fail

	const options: vscode.TextDocumentShowOptions = {}

	if (request.options?.preview !== undefined) {
		options.preview = request.options.preview
	}
	if (request.options?.preserveFocus !== undefined) {
		options.preserveFocus = request.options.preserveFocus
	}
	if (request.options?.viewColumn !== undefined) {
		options.viewColumn = request.options.viewColumn
	}
	// --- CUSTOM START: Line navigation ---
	if (revealLine !== undefined) {
		const line = revealLine - 1 // Convert 1-based to 0-based
		const position = new vscode.Position(line, 0)
		options.selection = new vscode.Range(position, position)
	}
	// --- CUSTOM END ---

	const editor = await vscode.window.showTextDocument(uri, options)

	return TextEditorInfo.create({
		documentPath: editor.document.uri.fsPath,
		viewColumn: editor.viewColumn,
		isActive: vscode.window.activeTextEditor === editor,
	})
}
