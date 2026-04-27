import { StringRequest } from "@shared/proto/cline/common"
import { VSCodeButton, VSCodeDivider } from "@vscode/webview-ui-toolkit/react"
import React from "react"
import { PLATFORM_CONFIG } from "../../config/platform.config"
import { FileServiceClient } from "../../services/grpc-client"

interface TaskChangeSummaryProps {
	changes: Record<string, { added: number; changed: number; deleted: number; firstChangedLine?: number }>
	onClose: () => void
}

const TaskChangeSummary: React.FC<TaskChangeSummaryProps> = ({ changes, onClose }) => {
	const fileEntries = Object.entries(changes)
	if (fileEntries.length === 0) return null

	const handleApprove = () => {
		PLATFORM_CONFIG.postMessage({ type: "approve_all_changes" })
		onClose()
	}

	const handleReject = () => {
		PLATFORM_CONFIG.postMessage({ type: "reject_all_changes" })
		onClose()
	}

	const handleOpenFile = (path: string, firstChangedLine?: number) => {
		// --- CUSTOM START: Line navigation ---
		// Encode line number as "path|lineNumber" - parsed by openFileRelativePath backend
		const value = firstChangedLine && firstChangedLine > 0 ? `${path}|${firstChangedLine}` : path
		// --- CUSTOM END ---
		FileServiceClient.openFileRelativePath(StringRequest.create({ value })).catch((err) => {
			console.error("Failed to open file:", err)
		})
	}

	return (
		<div
			style={{
				backgroundColor: "var(--vscode-sideBar-background)",
				border: "1px solid var(--vscode-panel-border)",
				borderRadius: "6px",
				padding: "12px",
				margin: "10px 0",
				position: "relative",
				boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
				animation: "slideIn 0.3s ease-out",
			}}>
			<style>
				{`
				@keyframes slideIn {
					from { transform: translateY(10px); opacity: 0; }
					to { transform: translateY(0); opacity: 1; }
				}
				.change-item {
					display: flex;
					align-items: center;
					gap: 8px;
					margin-bottom: 6px;
					font-size: 13px;
					color: var(--vscode-foreground);
				}
				.file-path {
					flex: 1;
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
					font-family: var(--vscode-editor-font-family, monospace);
					opacity: 0.9;
					cursor: pointer;
					transition: opacity 0.2s;
				}
				.file-path:hover {
					opacity: 1;
					text-decoration: underline;
					color: var(--vscode-textLink-foreground);
				}
				.stats {
					display: flex;
					gap: 8px;
					font-family: var(--vscode-editor-font-family, monospace);
					font-weight: 600;
					min-width: fit-content;
				}
				.stat-add { color: #4ec9b0; } /* Fallback green */
				.stat-del { color: #f48771; } /* Fallback red */
				.stat-add-vsc { color: var(--vscode-gitDecoration-addedResourceForeground); }
				.stat-del-vsc { color: var(--vscode-gitDecoration-deletedResourceForeground); }
				.diff-bar {
					display: flex;
					gap: 1px;
					align-items: center;
					min-width: 60px;
					height: 8px;
				}
				.diff-bar-added {
					background: var(--vscode-gitDecoration-addedResourceForeground, #4ec9b0);
					height: 100%;
					border-radius: 2px 0 0 2px;
					min-width: 2px;
				}
				.diff-bar-deleted {
					background: var(--vscode-gitDecoration-deletedResourceForeground, #f48771);
					height: 100%;
					border-radius: 0 2px 2px 0;
					min-width: 2px;
				}
				.line-hint {
					font-size: 10px;
					opacity: 0.5;
					font-family: var(--vscode-editor-font-family, monospace);
					margin-left: 2px;
					white-space: nowrap;
				}
				`}
			</style>

			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
				<span
					style={{
						fontWeight: "bold",
						fontSize: "11px",
						color: "var(--vscode-descriptionForeground)",
						textTransform: "uppercase",
						letterSpacing: "1px",
					}}>
					Task Changes
				</span>
			</div>

			<div style={{ maxHeight: "180px", overflowY: "auto", marginBottom: "12px", paddingRight: "4px" }}>
				{fileEntries.map(([path, stats]) => {
					const total = stats.added + stats.deleted
					const addedWidth = total > 0 ? Math.max(2, Math.round((stats.added / total) * 50)) : 0
					const deletedWidth = total > 0 ? Math.max(2, Math.round((stats.deleted / total) * 50)) : 0

					return (
						<div className="change-item" key={path}>
							<span className="codicon codicon-file" style={{ fontSize: "14px", opacity: 0.7 }} />
							<span
								className="file-path"
								onClick={() => handleOpenFile(path, stats.firstChangedLine)}
								title={
									stats.firstChangedLine ? `Open file at line ${stats.firstChangedLine} (first change)` : path
								}>
								{path}
							</span>
							{/* --- CUSTOM START: Mini diff bar visual --- */}
							{total > 0 && (
								<div className="diff-bar" title={`+${stats.added} -${stats.deleted}`}>
									{stats.added > 0 && <div className="diff-bar-added" style={{ width: `${addedWidth}px` }} />}
									{stats.deleted > 0 && (
										<div className="diff-bar-deleted" style={{ width: `${deletedWidth}px` }} />
									)}
								</div>
							)}
							{/* --- CUSTOM END --- */}
							<div className="stats">
								{stats.added > 0 && <span className="stat-add stat-add-vsc">+{stats.added}</span>}
								{stats.deleted > 0 && <span className="stat-del stat-del-vsc">-{stats.deleted}</span>}
							</div>
							{/* --- CUSTOM START: Line number hint --- */}
							{stats.firstChangedLine && (
								<span className="line-hint" title="First changed line">
									:{stats.firstChangedLine}
								</span>
							)}
							{/* --- CUSTOM END --- */}
						</div>
					)
				})}
			</div>

			<VSCodeDivider style={{ marginBottom: "12px", opacity: 0.5 }} />

			<div style={{ display: "flex", gap: "8px" }}>
				<VSCodeButton appearance="primary" onClick={handleApprove} style={{ flex: 1, height: "28px" }}>
					Approve All
				</VSCodeButton>
				<VSCodeButton appearance="secondary" onClick={handleReject} style={{ flex: 1, height: "28px" }}>
					Reject All
				</VSCodeButton>
			</div>
		</div>
	)
}

export default TaskChangeSummary
