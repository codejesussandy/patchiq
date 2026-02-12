import { useState, useCallback } from 'react';

interface UseModalReturn<T> {
  open: boolean;
  selectedItem: T | null;
  onOpen: (item?: T) => void;
  onClose: () => void;
}

/**
 * Manages modal open/close state with an optional selected item.
 * Clears the selected item when the modal is closed.
 *
 * @example
 * ```tsx
 * interface Patch { id: string; name: string }
 *
 * function PatchList() {
 *   const editModal = useModal<Patch>();
 *   const deleteModal = useModal<Patch>();
 *
 *   return (
 *     <>
 *       <Table
 *         onRow={(record) => ({
 *           onClick: () => editModal.onOpen(record),
 *         })}
 *       />
 *       <EditModal
 *         open={editModal.open}
 *         patch={editModal.selectedItem}
 *         onClose={editModal.onClose}
 *       />
 *       <DeleteConfirm
 *         open={deleteModal.open}
 *         patch={deleteModal.selectedItem}
 *         onClose={deleteModal.onClose}
 *       />
 *     </>
 *   );
 * }
 * ```
 */
export function useModal<T = unknown>(): UseModalReturn<T> {
  const [open, setOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<T | null>(null);

  const onOpen = useCallback((item?: T) => {
    setSelectedItem(item ?? null);
    setOpen(true);
  }, []);

  const onClose = useCallback(() => {
    setOpen(false);
    setSelectedItem(null);
  }, []);

  return { open, selectedItem, onOpen, onClose };
}
