import React from "react"
import ChatTextArea from "@/components/chat/ChatTextArea"
import QuotedMessagePreview from "@/components/chat/QuotedMessagePreview"
import TaskChangeSummary from "@/components/chat/TaskChangeSummary"
// --- CUSTOM START: Change Summary ---
import { useExtensionState } from "@/context/ExtensionStateContext"
import { ChatState, MessageHandlers, ScrollBehavior } from "../../types/chatTypes"

// --- CUSTOM END ---

interface InputSectionProps {
	chatState: ChatState
	messageHandlers: MessageHandlers
	scrollBehavior: ScrollBehavior
	placeholderText: string
	shouldDisableFilesAndImages: boolean
	selectFilesAndImages: () => Promise<void>
}

/**
 * Input section including quoted message preview and chat text area
 */
export const InputSection: React.FC<InputSectionProps> = ({
	chatState,
	messageHandlers,
	scrollBehavior,
	placeholderText,
	shouldDisableFilesAndImages,
	selectFilesAndImages,
}) => {
	const {
		activeQuote,
		setActiveQuote,
		isTextAreaFocused,
		inputValue,
		setInputValue,
		sendingDisabled,
		selectedImages,
		setSelectedImages,
		selectedFiles,
		setSelectedFiles,
		textAreaRef,
		handleFocusChange,
	} = chatState

	const { isAtBottom, scrollToBottomAuto } = scrollBehavior
	// --- CUSTOM START: Change Summary ---
	const { fileChanges } = useExtensionState()
	const { showChangeSummary, setShowChangeSummary } = chatState

	// Auto-reset showChangeSummary when new changes start coming in
	React.useEffect(() => {
		if (fileChanges && Object.keys(fileChanges).length > 0 && !showChangeSummary) {
			const hasSignificantChanges = Object.values(fileChanges).some((s) => s.added > 0 || s.changed > 0 || s.deleted > 0)
			if (hasSignificantChanges) {
				setShowChangeSummary(true)
			}
		}
	}, [fileChanges, showChangeSummary, setShowChangeSummary])
	// --- CUSTOM END ---

	return (
		<>
			{activeQuote && (
				<div style={{ marginBottom: "-12px", marginTop: "10px" }}>
					<QuotedMessagePreview
						isFocused={isTextAreaFocused}
						onDismiss={() => setActiveQuote(null)}
						text={activeQuote}
					/>
				</div>
			)}

			{/* --- CUSTOM START: Change Summary --- */}
			{fileChanges && showChangeSummary && (
				<TaskChangeSummary changes={fileChanges} onClose={() => setShowChangeSummary(false)} />
			)}
			{/* --- CUSTOM END --- */}

			<ChatTextArea
				activeQuote={activeQuote}
				inputValue={inputValue}
				onFocusChange={handleFocusChange}
				onHeightChange={() => {
					if (isAtBottom) {
						scrollToBottomAuto()
					}
				}}
				onSelectFilesAndImages={selectFilesAndImages}
				onSend={() => {
					// --- CUSTOM START: Change Summary ---
					setShowChangeSummary(true)
					// --- CUSTOM END ---
					messageHandlers.handleSendMessage(inputValue, selectedImages, selectedFiles)
				}}
				placeholderText={placeholderText}
				ref={textAreaRef}
				selectedFiles={selectedFiles}
				selectedImages={selectedImages}
				sendingDisabled={sendingDisabled}
				setInputValue={setInputValue}
				setSelectedFiles={setSelectedFiles}
				setSelectedImages={setSelectedImages}
				shouldDisableFilesAndImages={shouldDisableFilesAndImages}
			/>
		</>
	)
}
