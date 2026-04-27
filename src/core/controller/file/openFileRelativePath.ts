import { workspaceResolver } from "@core/workspace"
import { openFile as openFileIntegration } from "@integrations/misc/open-file"
import { Empty, StringRequest } from "@shared/proto/cline/common"
import { getWorkspacePath } from "@utils/path"
import { Logger } from "@/shared/services/Logger"
import { Controller } from ".."

/**
 * Opens a file in the editor by a relative path
 * @param controller The controller instance
 * @param request The request message containing the relative file path in the 'value' field.
 *                Supports optional line number suffix: "path/to/file.ts|42" to open at line 42.
 * @returns Empty response
 */
export async function openFileRelativePath(_controller: Controller, request: StringRequest): Promise<Empty> {
	const workspacePath = await getWorkspacePath()

	if (!workspacePath) {
		Logger.error("Error in openFileRelativePath: No workspace path available")
		return Empty.create()
	}

	if (request.value) {
		// --- CUSTOM START: Line navigation ---
		// Support "relativePath|lineNumber" format
		let relativePath = request.value
		let lineNumber: number | undefined
		const pipeIdx = request.value.lastIndexOf("|")
		if (pipeIdx !== -1) {
			const potentialLine = Number.parseInt(request.value.substring(pipeIdx + 1), 10)
			if (!isNaN(potentialLine) && potentialLine > 0) {
				relativePath = request.value.substring(0, pipeIdx)
				lineNumber = potentialLine
			}
		}
		// --- CUSTOM END ---

		// Resolve the relative path to absolute path
		const resolvedPath = workspaceResolver.resolveWorkspacePath(
			workspacePath,
			relativePath,
			"Controller.openFileRelativePath",
		)
		const absolutePath = typeof resolvedPath === "string" ? resolvedPath : resolvedPath.absolutePath

		// Open the file using the existing integration
		openFileIntegration(absolutePath, false, false, lineNumber)
	}

	return Empty.create()
}
