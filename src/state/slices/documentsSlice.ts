import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../store'

export interface Document {
  id: string
  userId: string
  title: string
  content: unknown
  plainText: string | null
  projectId: string | null
  isPinned: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateDocumentInput {
  title: string
  content?: unknown
  plainText?: string
  projectId?: string | null
  isPinned?: boolean
}

export interface UpdateDocumentInput {
  title?: string
  content?: unknown
  plainText?: string
  projectId?: string | null
  isPinned?: boolean
}

interface DocumentsState {
  documents: Document[]
  currentDocId: string | null
  isLoading: boolean
  error: string | null
}

const initialState: DocumentsState = {
  documents: [],
  currentDocId: null,
  isLoading: false,
  error: null,
}

export const fetchDocuments = createAsyncThunk(
  'documents/fetchDocuments',
  async (projectId?: string) => {
    const url = projectId ? `/api/documents?projectId=${projectId}` : '/api/documents'
    const response = await fetch(url)
    if (!response.ok) throw new Error('Failed to fetch documents')
    const data = await response.json()
    return data.data as Document[]
  }
)

export const fetchDocumentById = createAsyncThunk(
  'documents/fetchDocumentById',
  async (id: string) => {
    const response = await fetch(`/api/documents/${id}`)
    if (!response.ok) throw new Error('Failed to fetch document')
    const data = await response.json()
    return data.data as Document
  }
)

export const createDocument = createAsyncThunk(
  'documents/createDocument',
  async (doc: CreateDocumentInput) => {
    const response = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    })
    if (!response.ok) throw new Error('Failed to create document')
    const data = await response.json()
    return data.data as Document
  }
)

export const updateDocument = createAsyncThunk(
  'documents/updateDocument',
  async ({ id, updates }: { id: string; updates: UpdateDocumentInput }) => {
    const response = await fetch(`/api/documents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!response.ok) throw new Error('Failed to update document')
    const data = await response.json()
    return data.data as Document
  }
)

export const deleteDocument = createAsyncThunk(
  'documents/deleteDocument',
  async (id: string) => {
    const response = await fetch(`/api/documents/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error('Failed to delete document')
    return id
  }
)

export const importDocument = createAsyncThunk(
  'documents/importDocument',
  async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch('/api/documents/import', {
      method: 'POST',
      body: formData,
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error((err as { error?: string }).error || 'Import failed')
    }
    const data = await response.json()
    return data.data as Document
  }
)

export const documentsSlice = createSlice({
  name: 'documents',
  initialState,
  reducers: {
    setCurrentDocId: (state, action: PayloadAction<string | null>) => {
      state.currentDocId = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch documents
      .addCase(fetchDocuments.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchDocuments.fulfilled, (state, action) => {
        state.isLoading = false
        state.documents = action.payload
      })
      .addCase(fetchDocuments.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message ?? 'Failed to fetch documents'
      })
      // Fetch document by ID
      .addCase(fetchDocumentById.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchDocumentById.fulfilled, (state, action) => {
        state.isLoading = false
        state.currentDocId = action.payload.id
        const index = state.documents.findIndex(d => d.id === action.payload.id)
        if (index !== -1) {
          state.documents[index] = action.payload
        } else {
          state.documents.push(action.payload)
        }
      })
      .addCase(fetchDocumentById.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message ?? 'Failed to fetch document'
      })
      // Create document
      .addCase(createDocument.fulfilled, (state, action) => {
        state.documents.unshift(action.payload)
      })
      // Update document
      .addCase(updateDocument.fulfilled, (state, action) => {
        const index = state.documents.findIndex(d => d.id === action.payload.id)
        if (index !== -1) {
          state.documents[index] = action.payload
        }
      })
      // Delete document
      .addCase(deleteDocument.fulfilled, (state, action) => {
        state.documents = state.documents.filter(d => d.id !== action.payload)
        if (state.currentDocId === action.payload) {
          state.currentDocId = null
        }
      })
      // Import document
      .addCase(importDocument.fulfilled, (state, action) => {
        state.documents.unshift(action.payload)
      })
      .addCase(importDocument.rejected, (state, action) => {
        state.error = action.error.message ?? 'Import failed'
      })
  },
})

export const { setCurrentDocId } = documentsSlice.actions

// Selectors
export const selectDocuments = (state: RootState) => state.documents.documents
export const selectAllDocuments = (state: RootState) => state.documents.documents
export const selectCurrentDocId = (state: RootState) => state.documents.currentDocId
export const selectCurrentDocument = (state: RootState) => {
  if (!state.documents.currentDocId) return null
  return state.documents.documents.find(d => d.id === state.documents.currentDocId) ?? null
}
export const selectDocumentById = (id: string) => (state: RootState) =>
  state.documents.documents.find(d => d.id === id) ?? null
export const selectDocumentsLoading = (state: RootState) => state.documents.isLoading
export const selectDocumentsError = (state: RootState) => state.documents.error
export const selectPinnedDocuments = (state: RootState) =>
  state.documents.documents.filter(d => d.isPinned)

export default documentsSlice.reducer
