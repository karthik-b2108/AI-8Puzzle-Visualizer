import { useMemo } from 'react'
import type { ExploredListProps } from '../../contract/ui'
import { useTreeViewStore } from '../../store/useTreeViewStore'
import NodeList from './NodeList'
import { exploredItems, filterItems } from './listItems'

interface Props extends ExploredListProps {
  query?: string
}

export default function ExploredList({ snapshot, query = '' }: Props) {
  const hoveredId = useTreeViewStore((state) => state.hoveredId)
  const selectedId = useTreeViewStore((state) => state.selectedId)
  const setHovered = useTreeViewStore((state) => state.setHovered)
  const focusNode = useTreeViewStore((state) => state.focusNode)

  const items = useMemo(() => filterItems(exploredItems(snapshot), query), [snapshot, query])

  return (
    <NodeList
      items={items}
      hoveredId={hoveredId}
      selectedId={selectedId}
      onHover={setHovered}
      onActivate={(id) => focusNode(id, snapshot)}
      emptyLabel={query ? 'No explored node matches' : 'Nothing explored yet'}
    />
  )
}
