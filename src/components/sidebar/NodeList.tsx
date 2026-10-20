import { List, type RowComponentProps } from 'react-window'
import type { NodeListItem } from './listItems'
import StateRow from './StateRow'
import styles from './NodeList.module.css'

interface NodeListProps {
  items: NodeListItem[]
  hoveredId: number | null
  selectedId: number | null
  onHover: (id: number | null) => void
  onActivate: (id: number) => void
  emptyLabel: string
}

type RowData = Omit<NodeListProps, 'emptyLabel'>

const ROW_HEIGHT = 64

function NodeListRow({ index, style, items, hoveredId, selectedId, onHover, onActivate, ariaAttributes }: RowComponentProps<RowData>) {
  const item = items[index]
  if (!item) return null
  return (
    <StateRow
      id={item.id}
      state={item.state}
      depth={item.depth}
      status={item.status}
      isNext={item.isNext}
      order={item.order}
      highlighted={hoveredId === item.id || selectedId === item.id}
      onClick={() => onActivate(item.id)}
      onHover={() => onHover(item.id)}
      onLeave={() => onHover(null)}
      style={style}
      ariaAttributes={ariaAttributes}
    />
  )
}

/** Virtualized list of search nodes, shared by the Frontier and Explored tabs. */
export default function NodeList({ items, hoveredId, selectedId, onHover, onActivate, emptyLabel }: NodeListProps) {
  if (items.length === 0) {
    return (
      <div className={styles.empty} role="status">
        <span className={styles.emptyTitle}>{emptyLabel}</span>
        <span>Step the search or change the filter.</span>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <List
        rowCount={items.length}
        rowHeight={ROW_HEIGHT}
        rowComponent={NodeListRow}
        rowProps={{ items, hoveredId, selectedId, onHover, onActivate }}
        rowKey={(index, data) => data.items[index]?.id ?? index}
        overscanCount={6}
        defaultHeight={420}
        style={{ height: '100%', width: '100%' }}
        aria-label={`${items.length} nodes`}
      />
    </div>
  )
}
