import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import React from "react"

interface TaskChangeSummaryProps {
	changes: Record<string, { added: number; changed: number; deleted: number }>
	onClose: () => void
}

const TaskChangeSummary: React.FC<TaskChangeSummaryProps> = ({ changes, onClose }) => {
	const fileEntries = Object.entries(changes)
	if (fileEntries.length === 0) return null

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
					margin-bottom: 4px;
					font-size: 12px;
				}
				.file-path {
					color: var(--vscode-foreground);
					font-weight: 500;
					flex: 1;
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
				}
				.stats {
					display: flex;
					gap: 6px;
					font-family: var(--vscode-editor-font-family);
				}
				.stat-add { color: var(--vscode-gitDecoration-addedResourceForeground); }
				.stat-mod { color: var(--vscode-gitDecoration-modifiedResourceForeground); }
				.stat-del { color: var(--vscode-gitDecoration-deletedResourceForeground); }
				`}
			</style>

			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
				<span style={{ fontWeight: "bold", fontSize: "13px", color: "var(--vscode-descriptionForeground)" }}>
					Task Summary
				</span>
				<VSCodeButton appearance="icon" onClick={onClose} style={{ height: "20px", width: "20px" }}>
					<span className="codicon codicon-close" />
				</VSCodeButton>
			</div>

			<div style={{ maxHeight: "150px", overflowY: "auto" }}>
				{fileEntries.map(([path, stats]) => (
					<div className="change-item" key={path}>
						<span className="codicon codicon-file" />
						<span className="file-path" title={path}>
							{path}
						</span>
						<div className="stats">
							{stats.added > 0 && <span className="stat-add">+{stats.added}</span>}
							{stats.changed > 0 && <span className="stat-mod">~{stats.changed}</span>}
							{stats.deleted > 0 && <span className="stat-del">-{stats.deleted}</span>}
						</div>
					</div>
				))}
			</div>
		</div>
	)
}

export default TaskChangeSummary
