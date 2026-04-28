import { create } from 'zustand';

import type {
  ImportInstallResult,
  ImportPreview,
  StackCategory,
} from '@bridge/core';

export type ImportStage = 'idle' | 'loading' | 'preview' | 'installing' | 'success' | 'error';

interface ImportStore {
  open: boolean;
  stage: ImportStage;
  url: string;
  /** User can override the auto-detected category before confirming. */
  overrideCategory: StackCategory | null;
  /** Editable name (defaults to detected name). */
  editableName: string;
  preview: ImportPreview | null;
  installResult: ImportInstallResult | null;
  error: string | null;

  openModal: () => void;
  /** Open with a URL pre-filled and immediately fetch the preview. */
  openModalWithUrl: (url: string) => Promise<void>;
  closeModal: () => Promise<void>;
  setUrl: (url: string) => void;
  setOverrideCategory: (category: StackCategory | null) => void;
  setEditableName: (name: string) => void;

  loadPreview: () => Promise<void>;
  confirmInstall: () => Promise<void>;
}

export const useImportStore = create<ImportStore>((set, get) => ({
  open: false,
  stage: 'idle',
  url: '',
  overrideCategory: null,
  editableName: '',
  preview: null,
  installResult: null,
  error: null,

  openModal: () => set({ open: true, stage: 'idle', url: '', preview: null, error: null }),

  openModalWithUrl: async (url) => {
    set({
      open: true,
      stage: 'idle',
      url,
      preview: null,
      error: null,
      overrideCategory: null,
      editableName: '',
    });
    // Immediately kick off the preview — Discover users have already
    // committed to "this repo, that category" by clicking Install. No reason
    // to make them click Preview a second time.
    await get().loadPreview();
  },

  closeModal: async () => {
    const id = get().preview?.previewId;
    if (id && get().stage !== 'success') {
      // Tell main to clean up the tmp dir for an abandoned preview.
      await window.bridge.cancelImport(id).catch(() => undefined);
    }
    set({
      open: false,
      stage: 'idle',
      url: '',
      overrideCategory: null,
      editableName: '',
      preview: null,
      installResult: null,
      error: null,
    });
  },

  setUrl: (url) => set({ url }),
  setOverrideCategory: (overrideCategory) => set({ overrideCategory }),
  setEditableName: (editableName) => set({ editableName }),

  loadPreview: async () => {
    const url = get().url.trim();
    if (!url) {
      set({ error: 'Paste a repo URL', stage: 'error' });
      return;
    }
    set({ stage: 'loading', error: null });
    try {
      const preview = await window.bridge.previewImport({ url });
      set({
        preview,
        stage: 'preview',
        editableName: preview.name,
        overrideCategory: null,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Could not preview repo',
        stage: 'error',
      });
    }
  },

  confirmInstall: async () => {
    const { preview, overrideCategory, editableName } = get();
    if (!preview) return;

    const detectedPrimary = primaryCategory(preview);
    const finalCategory = overrideCategory ?? detectedPrimary;
    if (!finalCategory) {
      set({ error: 'Pick a category to install as', stage: 'error' });
      return;
    }

    set({ stage: 'installing', error: null });
    try {
      const installResult = await window.bridge.confirmImport({
        previewId: preview.previewId,
        category: finalCategory,
        name: editableName.trim() || preview.name,
      });
      set({ installResult, stage: installResult.ok ? 'success' : 'error' });
      if (!installResult.ok) {
        set({ error: installResult.error ?? 'Install failed' });
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Install failed',
        stage: 'error',
      });
    }
  },
}));

function primaryCategory(preview: ImportPreview): StackCategory | null {
  if (preview.detectedCategory === 'unknown') return null;
  if (preview.detectedCategory === 'ambiguous') {
    return preview.candidates[0] ?? null;
  }
  return preview.detectedCategory;
}
