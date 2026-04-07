import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import type { AssistantMessage, Conversation, VoiceId } from '@/types'
import { DEFAULT_VOICE } from '@/types/voice'
import type { RootState } from '../store'

interface SuggestedAction {
  label: string
  action: string
  icon?: string
}

interface ActionResult {
  success: boolean
  message: string
  data?: Record<string, unknown>
}

interface AssistantContext {
  todayEvents: number
  pendingHabits: number
  recentThoughts: number
}

interface AssistantState {
  conversations: Conversation[]
  currentConversationId: string | null
  messages: AssistantMessage[]
  isLoading: boolean
  isTyping: boolean
  error: string | null
  suggestedActions: SuggestedAction[]
  dynamicSuggestedActions: SuggestedAction[]
  lastActionResult: ActionResult | null
  lastExecutedIntent: string | null
  context: AssistantContext
  // Voice mode state
  voiceEnabled: boolean
  selectedVoice: VoiceId
}

const defaultSuggestedActions: SuggestedAction[] = [
  { label: 'Analyze my thinking', action: 'analyze_thinking', icon: 'brain' },
  { label: 'What should I focus on?', action: 'strategy', icon: 'target' },
  { label: 'Capture an idea', action: 'capture_idea', icon: 'lightbulb' },
  { label: 'Challenge my assumptions', action: 'challenge', icon: 'zap' },
]

const initialState: AssistantState = {
  conversations: [],
  currentConversationId: null,
  messages: [],
  isLoading: false,
  isTyping: false,
  error: null,
  suggestedActions: defaultSuggestedActions,
  dynamicSuggestedActions: [],
  lastActionResult: null,
  lastExecutedIntent: null,
  context: {
    todayEvents: 0,
    pendingHabits: 0,
    recentThoughts: 0,
  },
  voiceEnabled: false,
  selectedVoice: DEFAULT_VOICE,
}

export const fetchConversations = createAsyncThunk(
  'assistant/fetchConversations',
  async () => {
    const response = await fetch('/api/live-assistant/conversations')
    if (!response.ok) throw new Error('Failed to fetch conversations')
    const data = await response.json()
    return data.data as Conversation[]
  }
)

export const fetchMessages = createAsyncThunk(
  'assistant/fetchMessages',
  async (conversationId: string) => {
    const response = await fetch(`/api/live-assistant?conversationId=${conversationId}`)
    if (!response.ok) throw new Error('Failed to fetch messages')
    const data = await response.json()
    return { conversationId, messages: data.data as AssistantMessage[] }
  }
)

export const sendMessage = createAsyncThunk(
  'assistant/sendMessage',
  async ({
    conversationId,
    content,
    pageContext,
    attachment,
  }: {
    conversationId?: string
    content: string
    pageContext?: Record<string, unknown>
    attachment?: { base64: string; mimeType: string; name: string }
  }) => {
    const responseStyle = typeof window !== 'undefined'
      ? localStorage.getItem('ai-response-style') || 'balanced'
      : 'balanced'
    const response = await fetch('/api/live-assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, content, responseStyle, pageContext, attachment }),
    })
    if (!response.ok) throw new Error('Failed to send message')
    const data = await response.json()
    return data.data as {
      userMessage: AssistantMessage
      assistantMessage: AssistantMessage
      conversationId: string
      actionResult: ActionResult | null
      executedIntent: string | null
      suggestedActions: SuggestedAction[]
    }
  }
)

export const provideFeedback = createAsyncThunk(
  'assistant/provideFeedback',
  async ({ messageId, feedback }: { messageId: string; feedback: 'helpful' | 'not_helpful' }) => {
    const response = await fetch('/api/live-assistant/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, feedback }),
    })
    if (!response.ok) throw new Error('Failed to provide feedback')
    return { messageId, feedback }
  }
)

export const assistantSlice = createSlice({
  name: 'assistant',
  initialState,
  reducers: {
    setCurrentConversation: (state, action: PayloadAction<string | null>) => {
      state.currentConversationId = action.payload
      if (!action.payload) {
        state.messages = []
        state.dynamicSuggestedActions = []
        state.lastActionResult = null
      }
    },
    addLocalMessage: (state, action: PayloadAction<Partial<AssistantMessage>>) => {
      state.messages.push(action.payload as AssistantMessage)
    },
    setIsTyping: (state, action: PayloadAction<boolean>) => {
      state.isTyping = action.payload
    },
    updateContext: (state, action: PayloadAction<Partial<AssistantContext>>) => {
      state.context = { ...state.context, ...action.payload }
    },
    clearLastActionResult: (state) => {
      state.lastActionResult = null
    },
    clearError: (state) => {
      state.error = null
    },
    startNewConversation: (state) => {
      state.currentConversationId = null
      state.messages = []
      state.dynamicSuggestedActions = []
      state.lastActionResult = null
      state.error = null
    },
    setVoiceEnabled: (state, action: PayloadAction<boolean>) => {
      state.voiceEnabled = action.payload
    },
    setSelectedVoice: (state, action: PayloadAction<VoiceId>) => {
      state.selectedVoice = action.payload
    },
    addStreamedAssistantMessage: (
      state,
      action: PayloadAction<{ content: string; conversationId: string }>
    ) => {
      state.currentConversationId = action.payload.conversationId
      state.messages.push({
        id: `streamed-${Date.now()}`,
        role: 'assistant',
        content: action.payload.content,
        createdAt: new Date().toISOString(),
        conversationId: action.payload.conversationId,
        feedback: null,
      } as AssistantMessage)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.conversations = action.payload
      })
      .addCase(fetchMessages.pending, (state) => {
        state.isLoading = true
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.isLoading = false
        state.currentConversationId = action.payload.conversationId
        state.messages = action.payload.messages
      })
      .addCase(sendMessage.pending, (state, action) => {
        state.isTyping = true
        state.lastActionResult = null
        state.lastExecutedIntent = null
        // Optimistic user message — appears instantly before server responds
        state.messages.push({
          id: `pending-${Date.now()}`,
          role: 'user',
          content: action.meta.arg.content,
          createdAt: new Date().toISOString(),
          conversationId: state.currentConversationId ?? '',
          feedback: null,
        } as AssistantMessage)
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.isTyping = false
        state.currentConversationId = action.payload.conversationId
        // Replace the optimistic user message with the confirmed ones
        state.messages = state.messages.filter(m => !m.id.startsWith('pending-'))
        state.messages.push(action.payload.userMessage)
        state.messages.push(action.payload.assistantMessage)
        state.lastActionResult = action.payload.actionResult
        state.lastExecutedIntent = action.payload.executedIntent ?? null
        if (action.payload.suggestedActions?.length > 0) {
          state.dynamicSuggestedActions = action.payload.suggestedActions
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.isTyping = false
        state.error = action.error.message ?? 'Failed to send message'
      })
      .addCase(provideFeedback.fulfilled, (state, action) => {
        const message = state.messages.find((m) => m.id === action.payload.messageId)
        if (message) {
          message.feedback = action.payload.feedback
        }
      })
  },
})

export const {
  setCurrentConversation,
  addLocalMessage,
  setIsTyping,
  updateContext,
  clearLastActionResult,
  clearError,
  startNewConversation,
  setVoiceEnabled,
  setSelectedVoice,
  addStreamedAssistantMessage,
} = assistantSlice.actions

export const selectConversations = (state: RootState) => state.assistant.conversations
export const selectCurrentConversationId = (state: RootState) =>
  state.assistant.currentConversationId
export const selectMessages = (state: RootState) => state.assistant.messages
export const selectIsTyping = (state: RootState) => state.assistant.isTyping
export const selectSuggestedActions = (state: RootState) => state.assistant.suggestedActions
export const selectDynamicSuggestedActions = (state: RootState) =>
  state.assistant.dynamicSuggestedActions
export const selectLastActionResult = (state: RootState) => state.assistant.lastActionResult
export const selectLastExecutedIntent = (state: RootState) => state.assistant.lastExecutedIntent
export const selectAssistantContext = (state: RootState) => state.assistant.context
export const selectAssistantLoading = (state: RootState) => state.assistant.isLoading
export const selectAssistantError = (state: RootState) => state.assistant.error

// Selector that returns dynamic actions if available, otherwise default actions
export const selectActiveActions = (state: RootState) =>
  state.assistant.dynamicSuggestedActions.length > 0
    ? state.assistant.dynamicSuggestedActions
    : state.assistant.suggestedActions

// Voice selectors
export const selectVoiceEnabled = (state: RootState) => state.assistant.voiceEnabled
export const selectSelectedVoice = (state: RootState) => state.assistant.selectedVoice

export default assistantSlice.reducer
