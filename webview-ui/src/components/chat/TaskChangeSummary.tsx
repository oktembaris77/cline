import { StringRequest } from "@shared/proto/cline/common"
import { VSCodeButton, VSCodeDivider } from "@vscode/webview-ui-toolkit/react"
import React, { useState } from "react"
import { PLATFORM_CONFIG } from "../../config/platform.config"
import { FileServiceClient } from "../../services/grpc-client"

interface TaskChangeSummaryProps {
	changes: Record<string, { added: number; changed: number; deleted: number; changedLineNumbers?: number[] }>
	onClose: () => void
}

const TaskChangeSummary: React.FC<TaskChangeSummaryProps> = ({ changes, onClose }) => {
	const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({})

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

	const handleOpenFile = (path: string, lineNumber?: number) => {
		// --- CUSTOM START: Line navigation ---
		// Encode line number as "path|lineNumber" - parsed by openFileRelativePath backend
		const value = lineNumber && lineNumber > 0 ? `${path}|${lineNumber}` : path
		// --- CUSTOM END ---
		FileServiceClient.openFileRelativePath(StringRequest.create({ value })).catch((err) => {
			console.error("Failed to open file:", err)
		})
	}

	const toggleExpand = (path: string, e: React.MouseEvent) => {
		e.stopPropagation()
		setExpandedFiles((prev) => ({
			...prev,
			[path]: !prev[path],
		}))
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
				.change-item-container {
					margin-bottom: 8px;
				}
				.change-item {
					display: flex;
					align-items: center;
					gap: 4px;
					font-size: 13px;
					color: var(--vscode-foreground);
					cursor: pointer;
				}
				.file-path {
					flex: 1;
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
					font-family: var(--vscode-editor-font-family, monospace);
					opacity: 0.9;
					transition: opacity 0.2s;
				}
				.file-path:hover {
					opacity: 1;
					text-decoration: underline;
					color: var(--vscode-textLink-foreground);
				}
				.stats {
					display: flex;
					gap: 6px;
					font-family: var(--vscode-editor-font-family, monospace);
					font-weight: 600;
					min-width: fit-content;
					font-size: 11px;
				}
				.stat-add { color: #4ec9b0; }
				.stat-del { color: #f48771; }
				.stat-add-vsc { color: var(--vscode-gitDecoration-addedResourceForeground); }
				.stat-del-vsc { color: var(--vscode-gitDecoration-deletedResourceForeground); }
				
				.sub-lines {
					margin-left: 20px;
					margin-top: 4px;
					display: flex;
					flex-direction: column;
					gap: 2px;
					border-left: 1px solid var(--vscode-panel-border);
					padding-left: 8px;
				}
				.sub-line {
					font-size: 11px;
					opacity: 0.7;
					font-family: var(--vscode-editor-font-family, monospace);
					cursor: pointer;
					padding: 2px 4px;
					border-radius: 3px;
				}
				.sub-line:hover {
					opacity: 1;
					background: var(--vscode-list-hoverBackground);
					color: var(--vscode-textLink-foreground);
				}
				.expand-icon {
					font-size: 12px;
					opacity: 0.5;
					cursor: pointer;
					width: 16px;
					height: 16px;
					display: flex;
					align-items: center;
					justify-content: center;
					transition: transform 0.2s;
				}
				.expand-icon.expanded {
					transform: rotate(90deg);
				}
				.diff-bar {
					display: flex;
					gap: 1px;
					align-items: center;
					min-width: 40px;
					height: 4px;
					opacity: 0.6;
				}
				.diff-bar-added {
					background: var(--vscode-gitDecoration-addedResourceForeground, #4ec9b0);
					height: 100%;
					border-radius: 1px 0 0 1px;
				}
				.diff-bar-deleted {
					background: var(--vscode-gitDecoration-deletedResourceForeground, #f48771);
					height: 100%;
					border-radius: 0 1px 1px 0;
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

			<div style={{ maxHeight: "250px", overflowY: "auto", marginBottom: "12px", paddingRight: "4px" }}>
				{fileEntries.map(([path, stats]) => {
					const isExpanded = expandedFiles[path]
					const lineNumbers = stats.changedLineNumbers || []
					const total = stats.added + stats.deleted
					const addedWidth = total > 0 ? Math.max(1, Math.round((stats.added / total) * 40)) : 0
					const deletedWidth = total > 0 ? Math.max(1, Math.round((stats.deleted / total) * 40)) : 0

					return (
						<div className="change-item-container" key={path}>
							<div className="change-item">
								<div
									className={`expand-icon codicon codicon-chevron-right ${isExpanded ? "expanded" : ""}`}
									onClick={(e) => toggleExpand(path, e)}
								/>
								<span className="codicon codicon-file" style={{ fontSize: "14px", opacity: 0.7 }} />
								<span
									className="file-path"
									onClick={() => handleOpenFile(path, lineNumbers[0])}
									title={`Open ${path}${lineNumbers[0] ? ` at line ${lineNumbers[0]}` : ""}`}>
									{path}
								</span>

								<div className="diff-bar">
									{stats.added > 0 && <div className="diff-bar-added" style={{ width: `${addedWidth}px` }} />}
									{stats.deleted > 0 && (
										<div className="diff-bar-deleted" style={{ width: `${deletedWidth}px` }} />
									)}
								</div>

								<div className="stats">
									{stats.added > 0 && <span className="stat-add stat-add-vsc">+{stats.added}</span>}
									{stats.deleted > 0 && <span className="stat-del stat-del-vsc">-{stats.deleted}</span>}
								</div>
							</div>

							{isExpanded && lineNumbers.length > 0 && (
								<div className="sub-lines">
									{lineNumbers.map((ln, idx) => (
										<div
											className="sub-line"
											key={`${path}-${ln}-${idx}`}
											onClick={() => handleOpenFile(path, ln)}>
											{path} :{ln}
										</div>
									))}
								</div>
							)}
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
