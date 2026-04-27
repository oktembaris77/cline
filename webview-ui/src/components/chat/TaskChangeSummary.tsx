import { StringRequest } from "@shared/proto/cline/common"
import { VSCodeButton, VSCodeDivider } from "@vscode/webview-ui-toolkit/react"
import React, { useEffect, useMemo, useState } from "react"
import { PLATFORM_CONFIG } from "../../config/platform.config"
import { FileServiceClient } from "../../services/grpc-client"

interface HunkInfo {
	id: string
	startLine: number
	added: number
	deleted: number
	status: "pending" | "approved" | "rejected"
	oldValue: string
	newValue: string
}

interface TaskChangeSummaryProps {
	changes: Record<
		string,
		{
			added: number
			changed: number
			deleted: number
			hunks?: HunkInfo[]
		}
	>
	onClose: () => void
}

const TaskChangeSummary: React.FC<TaskChangeSummaryProps> = ({ changes: initialChanges, onClose }) => {
	const [isMainExpanded, setIsMainExpanded] = useState(true)
	const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({})

	// Local state to track interactive changes
	const [localChanges, setLocalChanges] = useState(initialChanges)

	// Sync local changes if initialChanges changes (e.g. new files added by AI)
	useEffect(() => {
		setLocalChanges((prev) => {
			const next = { ...initialChanges }
			// Preserve local status if file already exists
			Object.keys(prev).forEach((path) => {
				if (next[path] && prev[path].hunks && next[path].hunks) {
					const prevHunks = prev[path].hunks!
					next[path].hunks = next[path].hunks!.map((h) => {
						const existing = prevHunks.find((ph) => ph.id === h.id)
						return existing ? { ...h, status: existing.status } : h
					})
				}
			})
			return next
		})
	}, [initialChanges])

	const fileEntries = Object.entries(localChanges)

	const statsPerFile = useMemo(() => {
		const result: Record<string, { added: number; deleted: number }> = {}
		fileEntries.forEach(([path, file]) => {
			if (!file.hunks || file.hunks.length === 0) {
				result[path] = { added: file.added, deleted: file.deleted }
			} else {
				let added = 0
				let deleted = 0
				file.hunks.forEach((h) => {
					if (h.status !== "rejected") {
						added += h.added
						deleted += h.deleted
					}
				})
				result[path] = { added, deleted }
			}
		})
		return result
	}, [localChanges, fileEntries])

	const totalFiles = fileEntries.length
	if (totalFiles === 0) return null

	const handleApprove = () => {
		PLATFORM_CONFIG.postMessage({ type: "approve_all_changes" })
		onClose()
	}

	const handleReject = () => {
		PLATFORM_CONFIG.postMessage({ type: "reject_all_changes" })
		onClose()
	}

	const handleOpenFile = (path: string, lineNumber?: number) => {
		const value = lineNumber && lineNumber > 0 ? `${path}|${lineNumber}` : path
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

	const updateHunkStatus = (path: string, hunkId: string, status: "approved" | "rejected" | "pending", e: React.MouseEvent) => {
		e.stopPropagation()
		setLocalChanges((prev) => {
			const file = prev[path]
			if (!file || !file.hunks) return prev

			const newHunks = file.hunks.map((h) => (h.id === hunkId ? { ...h, status } : h))

			return {
				...prev,
				[path]: { ...file, hunks: newHunks },
			}
		})

		PLATFORM_CONFIG.postMessage({
			type: "update_hunk_status",
			payload: { path, hunkId, status },
		})
	}

	const handleDone = () => {
		PLATFORM_CONFIG.postMessage({ type: "apply_hunk_changes" })
		onClose()
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
				.header-container {
					display: flex;
					justify-content: space-between;
					align-items: center;
					margin-bottom: ${isMainExpanded ? "10px" : "0"};
					cursor: pointer;
					user-select: none;
				}
				.header-text {
					font-weight: bold;
					font-size: 11px;
					color: var(--vscode-descriptionForeground);
					text-transform: uppercase;
					letter-spacing: 1px;
					display: flex;
					align-items: center;
					gap: 6px;
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
				.stat-add-vsc { color: var(--vscode-gitDecoration-addedResourceForeground); }
				.stat-del-vsc { color: var(--vscode-gitDecoration-deletedResourceForeground); }
				
				.sub-lines {
					margin-left: 20px;
					margin-top: 4px;
					display: flex;
					flex-direction: column;
					gap: 4px;
					border-left: 1px solid var(--vscode-panel-border);
					padding-left: 8px;
				}
				.sub-line {
					display: flex;
					align-items: center;
					justify-content: space-between;
					gap: 8px;
					padding: 4px 8px;
					border-radius: 4px;
					background: var(--vscode-editor-background);
					border: 1px solid transparent;
					transition: all 0.2s;
				}
				.sub-line:hover {
					border-color: var(--vscode-panel-border);
				}
				.sub-line.rejected {
					opacity: 0.5;
				}
				.sub-line.rejected .sub-line-info {
					text-decoration: line-through;
				}
				.sub-line.approved {
					background: rgba(78, 201, 176, 0.05);
					border-color: rgba(78, 201, 176, 0.2);
				}
				.sub-line-info {
					font-size: 11px;
					font-family: var(--vscode-editor-font-family, monospace);
					cursor: pointer;
					flex: 1;
					display: flex;
					align-items: center;
					gap: 6px;
				}
				.status-dot {
					width: 6px;
					height: 6px;
					border-radius: 50%;
					background: var(--vscode-descriptionForeground);
					opacity: 0.3;
				}
				.approved .status-dot { background: #4ec9b0; opacity: 1; }
				.rejected .status-dot { background: #f48771; opacity: 1; }

				.hunk-actions {
					display: flex;
					gap: 4px;
				}
				.hunk-btn {
					width: 24px;
					height: 24px;
					display: flex;
					align-items: center;
					justify-content: center;
					border-radius: 4px;
					cursor: pointer;
					font-size: 14px;
					opacity: 0.5;
					transition: all 0.2s;
				}
				.hunk-btn:hover {
					opacity: 1;
					background: var(--vscode-list-hoverBackground);
				}
				.hunk-btn.active-app { 
					color: #4ec9b0; 
					opacity: 1;
					background: rgba(78, 201, 176, 0.1);
				}
				.hunk-btn.active-rej { 
					color: #f48771; 
					opacity: 1;
					background: rgba(244, 135, 113, 0.1);
				}

				.expand-icon {
					font-size: 12px;
					opacity: 0.5;
					width: 16px;
					height: 16px;
					display: flex;
					align-items: center;
					justify-content: center;
					transition: transform 0.2s;
				}
				.expand-icon.expanded { transform: rotate(90deg); }
				.diff-bar {
					display: flex;
					gap: 1px;
					align-items: center;
					min-width: 40px;
					height: 4px;
					opacity: 0.6;
				}
				.diff-bar-added { background: var(--vscode-gitDecoration-addedResourceForeground, #4ec9b0); height: 100%; }
				.diff-bar-deleted { background: var(--vscode-gitDecoration-deletedResourceForeground, #f48771); height: 100%; }
				`}
			</style>

			<div className="header-container" onClick={() => setIsMainExpanded(!isMainExpanded)}>
				<span className="header-text">
					<div className={`expand-icon codicon codicon-chevron-right ${isMainExpanded ? "expanded" : ""}`} />
					Task Changes ({totalFiles})
				</span>
			</div>

			{isMainExpanded && (
				<>
					<div style={{ maxHeight: "300px", overflowY: "auto", marginBottom: "12px", paddingRight: "4px" }}>
						{fileEntries.map(([path, file]) => {
							const isExpanded = expandedFiles[path]
							const stats = statsPerFile[path]
							const hunks = file.hunks || []
							const total = stats.added + stats.deleted
							const addedWidth = total > 0 ? Math.max(1, Math.round((stats.added / total) * 40)) : 0
							const deletedWidth = total > 0 ? Math.max(1, Math.round((stats.deleted / total) * 40)) : 0

							return (
								<div className="change-item-container" key={path}>
									<div className="change-item" onClick={(e) => toggleExpand(path, e)}>
										<div
											className={`expand-icon codicon codicon-chevron-right ${isExpanded ? "expanded" : ""}`}
										/>
										<span className="codicon codicon-file" style={{ fontSize: "14px", opacity: 0.7 }} />
										<span
											className="file-path"
											onClick={(e) => {
												e.stopPropagation()
												handleOpenFile(path, hunks[0]?.startLine)
											}}
											title={`Open ${path}`}>
											{path}
										</span>

										<div className="diff-bar">
											{stats.added > 0 && (
												<div className="diff-bar-added" style={{ width: `${addedWidth}px` }} />
											)}
											{stats.deleted > 0 && (
												<div className="diff-bar-deleted" style={{ width: `${deletedWidth}px` }} />
											)}
										</div>

										<div className="stats">
											{stats.added > 0 && <span className="stat-add-vsc">+{stats.added}</span>}
											{stats.deleted > 0 && <span className="stat-del-vsc">-{stats.deleted}</span>}
										</div>
									</div>

									{isExpanded && (
										<div className="sub-lines">
											{hunks.length > 0 ? (
												hunks.map((h) => (
													<div className={`sub-line ${h.status}`} key={h.id}>
														<div
															className="sub-line-info"
															onClick={() => handleOpenFile(path, h.startLine)}>
															<div className="status-dot" />
															<span>:{h.startLine}</span>
															<div className="stats" style={{ fontWeight: 400, opacity: 0.6 }}>
																{h.added > 0 && <span className="stat-add-vsc">+{h.added}</span>}
																{h.deleted > 0 && (
																	<span className="stat-del-vsc">-{h.deleted}</span>
																)}
															</div>
														</div>
														<div className="hunk-actions">
															<div
																className={`hunk-btn codicon codicon-check ${h.status === "approved" ? "active-app" : ""}`}
																onClick={(e) => updateHunkStatus(path, h.id, "approved", e)}
																title="Approve hunk"
															/>
															<div
																className={`hunk-btn codicon codicon-close ${h.status === "rejected" ? "active-rej" : ""}`}
																onClick={(e) => updateHunkStatus(path, h.id, "rejected", e)}
																title="Reject hunk"
															/>
														</div>
													</div>
												))
											) : (
												<div className="sub-line" style={{ fontStyle: "italic", opacity: 0.5 }}>
													Hunk details not available.
												</div>
											)}
										</div>
									)}
								</div>
							)
						})}
					</div>

					<VSCodeDivider style={{ marginBottom: "12px", opacity: 0.5 }} />

					<div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
						<VSCodeButton appearance="primary" onClick={handleDone} style={{ flex: "1 1 100%", height: "28px" }}>
							Done (Apply Selected)
						</VSCodeButton>
						<VSCodeButton
							appearance="secondary"
							onClick={handleApprove}
							style={{ flex: "1 1 calc(50% - 4px)", height: "28px" }}>
							Approve All
						</VSCodeButton>
						<VSCodeButton
							appearance="secondary"
							onClick={handleReject}
							style={{ flex: "1 1 calc(50% - 4px)", height: "28px" }}>
							Reject All
						</VSCodeButton>
					</div>
				</>
			)}
		</div>
	)
}

export default TaskChangeSummary
