import { useMemo } from 'react'
import type { FrontierListProps } from '../../contract/ui'
import { useTreeViewStore } from '../../store/useTreeViewStore'
import NodeList from './NodeList'
import { filterItems, frontierItems } from './listItems'

interface Props extends FrontierListProps {
  query?: string
}

export default function FrontierList({ snapshot, query = '' }: Props) {
  const hoveredId = useTreeViewStore((state) => state.hoveredId)
  const selectedId = useTreeViewStore((state) => state.selectedId)
  const setHovered = useTreeViewStore((state) => state.setHovered)
  const focusNode = useTreeViewStore((state) => state.focusNode)

  const items = useMemo(() => filterItems(frontierItems(snapshot), query), [snapshot, query])

  return (
    <NodeList
      items={items}
      hoveredId={hoveredId}
      selectedId={selectedId}
      onHover={setHovered}
      onActivate={(id) => focusNode(id, snapshot)}
      emptyLabel={query ? 'No frontier node matches' : 'The frontier is empty'}
    />
  )
}
