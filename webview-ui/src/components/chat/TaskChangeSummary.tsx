import { StringRequest } from "@shared/proto/cline/common"
import { VSCodeButton, VSCodeDivider } from "@vscode/webview-ui-toolkit/react"
import React from "react"
import { PLATFORM_CONFIG } from "../../config/platform.config"
import { FileServiceClient } from "../../services/grpc-client"

interface TaskChangeSummaryProps {
	changes: Record<string, { added: number; changed: number; deleted: number }>
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

	const handleOpenFile = (path: string) => {
		FileServiceClient.openFileRelativePath(StringRequest.create({ value: path })).catch((err) => {
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
				{fileEntries.map(([path, stats]) => (
					<div className="change-item" key={path}>
						<span className="codicon codicon-file" style={{ fontSize: "14px", opacity: 0.7 }} />
						<span className="file-path" onClick={() => handleOpenFile(path)} title={path}>
							{path}
						</span>
						<div className="stats">
							{stats.added > 0 && <span className="stat-add stat-add-vsc">+{stats.added}</span>}
							{stats.deleted > 0 && <span className="stat-del stat-del-vsc">-{stats.deleted}</span>}
						</div>
					</div>
				))}
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
