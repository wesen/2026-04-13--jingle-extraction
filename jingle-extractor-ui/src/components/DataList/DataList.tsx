/**
 * DataList.tsx — Generic dense tabular list primitive.
 *
 * Renders a list of items as grid-aligned rows with:
 * - Configurable columns (label, value, width, alignment)
 * - Optional row actions (e.g. preview ▶, analyze ▶ Run)
 * - Selected row highlight (aria-selected)
 * - Optional previewing indicator
 *
 * Inspired by: CandidateList row pattern.
 *
 * Usage:
 * ```tsx
 * const COLUMNS: ColumnDef<Track>[] = [
 *   { key: 'rank',      label: '#',     width: '22px',  align: 'center' },
 *   { key: 'name',     label: 'Name',  width: '1fr'               },
 *   { key: 'duration', label: 'Dur',   width: '42px', align: 'right' },
 *   { key: 'score',    label: 'Score', width: '34px', align: 'right' },
 *   { key: 'badge',    label: '',      width: '52px'              },
 * ];
 *
 * <DataList
 *   items={tracks}
 *   columns={COLUMNS}
 *   selectedId={selectedTrackId}
 *   onSelect={(t) => setSelected(t.id)}
 *   renderCell={(item, col) => <span>{item[col.key]}</span>}
 * />
 * ```
 */

import type { ReactNode } from 'react';
import { PARTS } from '../JingleExtractor/parts';
import '../shared/index.css';
import './DataList.css';

export interface ColumnDef<T = unknown> {
  /** Unique key — also used as data-part suffix for the cell */
  key: keyof T | string;
  /** Column header label (hidden for icon/badge columns) */
  label?: string;
  /** CSS grid width value (e.g. '22px', '1fr', 'minmax(0, 1fr)') */
  width?: string;
  /** Text alignment for the cell content */
  align?: 'left' | 'right' | 'center';
  /** Whether this column contains action buttons (skips padding) */
  isAction?: boolean;
}

export interface DataListAction<T> {
  /** Unique action key */
  key: string;
  /** Button label or icon content */
  label: ReactNode;
  /** aria-label for the button */
  ariaLabel?: string;
  /** Render function — return null to hide the button for this item */
  render?: (item: T) => ReactNode;
}

interface DataListProps<T extends { id: string | number }> {
  /** List items — must have a string | number id field */
  items: T[];
  /** Column definitions */
  columns: ColumnDef<T>[];
  /** Currently selected item id */
  selectedId: string | number | null;
  /** Currently previewing item id (e.g. audio playing) */
  previewingId?: string | number | null;
  /** Called when user clicks a row */
  onSelect: (item: T) => void;
  /** Optional row-level actions rendered in the action column */
  rowActions?: DataListAction<T>[];
  /** Optional explicit width for the action column (e.g. '52px') */
  actionColumnWidth?: string;
  /** Accessible label for the listbox */
  ariaLabel?: string;
  /** Additional class on the root */
  className?: string;
  /** Optional part override for root container */
  rootPart?: string;
  /** Optional part override for row */
  rowPart?: string;
  /** Optional part override for each cell */
  cellPart?: string;
  /** Optional part override for action wrapper */
  actionPart?: string;
  /** Render a single cell for a given column and item */
  renderCell: (item: T, column: ColumnDef<T>) => ReactNode;
}

export function DataList<T extends { id: string | number }>({
  items,
  columns,
  selectedId,
  previewingId = null,
  onSelect,
  rowActions = [],
  actionColumnWidth,
  ariaLabel = 'List',
  className,
  rootPart,
  rowPart,
  cellPart,
  actionPart,
  renderCell,
}: DataListProps<T>) {
  // Compute CSS grid template from column widths.
  // If row actions exist, append one extra fixed-width action column.
  const actionWidth = actionColumnWidth
    ?? (rowActions.length > 0
      ? `${Math.max(24, rowActions.length * 24 + (rowActions.length - 1) * 2)}px`
      : null);

  const gridTemplateColumns = [
    ...columns.map((col) => col.width ?? 'minmax(0, 1fr)'),
    ...(actionWidth ? [actionWidth] : []),
  ].join(' ');

  return (
    <div
      data-part={rootPart ?? PARTS.dataList}
      role="listbox"
      aria-label={ariaLabel}
      aria-multiselectable={false}
      className={className}
    >
      {items.map((item) => {
        const isSelected = item.id === selectedId;
        const isPreviewing = item.id === previewingId;

        return (
          <div
            key={String(item.id)}
            data-part={rowPart ?? PARTS.dataListRow}
            role="option"
            aria-selected={isSelected}
            data-previewing={isPreviewing ? 'true' : undefined}
            style={{ gridTemplateColumns }}
            onClick={() => onSelect(item)}
          >
            {columns.map((col) => (
              <div
                key={String(col.key)}
                data-part={cellPart ?? PARTS.dataListCell}
                data-col-key={String(col.key)}
                data-align={col.align ?? 'left'}
                data-is-action={col.isAction ? 'true' : undefined}
                style={{ textAlign: col.align ?? 'left' }}
              >
                {renderCell(item, col)}
              </div>
            ))}

            {rowActions.length > 0 && (
              <div
                data-part={cellPart ?? PARTS.dataListCell}
                data-col-key="__actions__"
                data-is-action="true"
                data-align="center"
                style={{ textAlign: 'center' }}
              >
                {rowActions.map((action) => {
                  const rendered = action.render?.(item);
                  if (rendered === null || rendered === false) return null;
                  return (
                    <span
                      key={action.key}
                      data-part={actionPart ?? PARTS.dataListActionBtn}
                      aria-label={action.ariaLabel}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {rendered}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
