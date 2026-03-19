import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../store'

interface Toast {
  id: string
  title: string
  description?: string
  type: 'success' | 'error' | 'info' | 'warning'
}

interface UIState {
  activeModal: string | null
  modalData: Record<string, unknown> | null
  toasts: Toast[]
  isMobileMenuOpen: boolean
  isSearchOpen: boolean
  searchQuery: string
  theme: 'light' | 'dark' | 'system'
  isSidebarCollapsed: boolean
  isWinterArcMode: boolean
  isRightPanelOpen: boolean
  isRightPanelPinned: boolean
}

const initialState: UIState = {
  activeModal: null,
  modalData: null,
  toasts: [],
  isMobileMenuOpen: false,
  isSearchOpen: false,
  searchQuery: '',
  theme: 'system',
  isSidebarCollapsed: false,
  isWinterArcMode: false,
  isRightPanelOpen: true,
  isRightPanelPinned: false,
}

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    openModal: (
      state,
      action: PayloadAction<{ modalName: string; data?: Record<string, unknown> }>
    ) => {
      state.activeModal = action.payload.modalName
      state.modalData = action.payload.data ?? null
    },
    closeModal: (state) => {
      state.activeModal = null
      state.modalData = null
    },
    addToast: (state, action: PayloadAction<Omit<Toast, 'id'>>) => {
      const id = Date.now().toString()
      state.toasts.push({ ...action.payload, id })
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload)
    },
    toggleMobileMenu: (state) => {
      state.isMobileMenuOpen = !state.isMobileMenuOpen
    },
    setMobileMenuOpen: (state, action: PayloadAction<boolean>) => {
      state.isMobileMenuOpen = action.payload
    },
    setSearchOpen: (state, action: PayloadAction<boolean>) => {
      state.isSearchOpen = action.payload
      if (!action.payload) {
        state.searchQuery = ''
      }
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.theme = action.payload
    },
    toggleSidebar: (state) => {
      state.isSidebarCollapsed = !state.isSidebarCollapsed
    },
    toggleWinterArcMode: (state) => {
      state.isWinterArcMode = !state.isWinterArcMode
    },
    toggleRightPanel: (state) => {
      state.isRightPanelOpen = !state.isRightPanelOpen
    },
    toggleRightPanelPin: (state) => {
      state.isRightPanelPinned = !state.isRightPanelPinned
    },
  },
})

export const {
  openModal,
  closeModal,
  addToast,
  removeToast,
  toggleMobileMenu,
  setMobileMenuOpen,
  setSearchOpen,
  setSearchQuery,
  setTheme,
  toggleSidebar,
  toggleWinterArcMode,
  toggleRightPanel,
  toggleRightPanelPin,
} = uiSlice.actions

export const selectActiveModal = (state: RootState) => state.ui.activeModal
export const selectModalData = (state: RootState) => state.ui.modalData
export const selectToasts = (state: RootState) => state.ui.toasts
export const selectIsMobileMenuOpen = (state: RootState) => state.ui.isMobileMenuOpen
export const selectIsSearchOpen = (state: RootState) => state.ui.isSearchOpen
export const selectSearchQuery = (state: RootState) => state.ui.searchQuery
export const selectTheme = (state: RootState) => state.ui.theme
export const selectIsSidebarCollapsed = (state: RootState) => state.ui.isSidebarCollapsed
export const selectIsWinterArcMode = (state: RootState) => state.ui.isWinterArcMode
export const selectIsRightPanelOpen = (state: RootState) => state.ui.isRightPanelOpen
export const selectIsRightPanelPinned = (state: RootState) => state.ui.isRightPanelPinned

export default uiSlice.reducer
