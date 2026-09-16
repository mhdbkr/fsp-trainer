import { useId, useRef, useState } from 'react';
import type { Fachwissen } from '@/db/types';
import type { DecisionTreeData, TreeNode, VisualBlock } from '@/data/fachwissenVisuals/types';
import { NodeBox, ToneMark } from './primitives';

// ============================================================================
// DecisionTree — arbre décisionnel accessible (`role="tree"`).
// Niveau 1 visible, profondeur > 1 repliée par défaut ; navigation clavier
// complète (flèches, Entrée/Espace, Échap) ; arêtes orthogonales en CSS pur
// (contrat §6/§7 : jamais de SVG courbe pour ce composant).
// ============================================================================

interface DecisionTreeProps {
  block: Extract<VisualBlock, { kind: 'decision-tree' }>;
  fw: Fachwissen;
}

interface FlatNode {
  id: string;
  depth: number;
  node: TreeNode;
  branchLabel?: string;
}

function flatten(node: TreeNode, depth: number, prefix: string, branchLabel: string | undefined, out: FlatNode[]): void {
  const id = prefix;
  out.push({ id, depth, node, branchLabel });
  if ('branches' in node) {
    node.branches.forEach((b, i) => {
      flatten(b.child, depth + 1, `${prefix}-${i}`, b.label, out);
    });
  }
}

function isLeafSignal(node: TreeNode): boolean {
  return 'answer' in node && node.tone === 'signal';
}

export default function DecisionTree({ block }: DecisionTreeProps) {
  const data: DecisionTreeData = block.data;
  const baseId = useId();
  const all: FlatNode[] = [];
  flatten(data.root, 1, 'n0', undefined, all);

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  if (all.length === 0) return null;

  function isExpanded(id: string): boolean {
    return expanded.has(id);
  }

  function toggle(id: string, force?: boolean): void {
    setExpanded((prev) => {
      const next = new Set(prev);
      const shouldExpand = force ?? !next.has(id);
      if (shouldExpand) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function visibleIds(): string[] {
    // Un nœud est visible si son parent est déplié (ou depth === 1).
    const visible: string[] = [];
    const byId = new Map(all.map((f) => [f.id, f]));
    for (const f of all) {
      if (f.depth === 1) {
        visible.push(f.id);
        continue;
      }
      const parentId = f.id.slice(0, f.id.lastIndexOf('-'));
      const parent = byId.get(parentId);
      if (parent && isVisibleAncestorExpanded(parentId, byId)) visible.push(f.id);
    }
    return visible;
  }

  function isVisibleAncestorExpanded(id: string, byId: Map<string, FlatNode>): boolean {
    const f = byId.get(id);
    if (!f) return false;
    if (!isExpanded(id)) return false;
    if (f.depth === 1) return true;
    const parentId = id.slice(0, id.lastIndexOf('-'));
    return isVisibleAncestorExpanded(parentId, byId);
  }

  function handleKeyDown(e: React.KeyboardEvent, f: FlatNode): void {
    const hasChildren = 'branches' in f.node;
    switch (e.key) {
      case 'Enter':
      case ' ':
        if (hasChildren) {
          e.preventDefault();
          toggle(f.id);
        }
        break;
      case 'Escape':
        if (hasChildren && isExpanded(f.id)) {
          e.preventDefault();
          toggle(f.id, false);
        }
        break;
      case 'ArrowRight':
        if (hasChildren) {
          e.preventDefault();
          toggle(f.id, true);
        }
        break;
      case 'ArrowLeft':
        if (hasChildren && isExpanded(f.id)) {
          e.preventDefault();
          toggle(f.id, false);
        }
        break;
      case 'ArrowDown': {
        e.preventDefault();
        const vis = visibleIds();
        const idx = vis.indexOf(f.id);
        const next = vis[idx + 1];
        if (next) itemRefs.current.get(next)?.focus();
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const vis = visibleIds();
        const idx = vis.indexOf(f.id);
        const prev = vis[idx - 1];
        if (prev) itemRefs.current.get(prev)?.focus();
        break;
      }
      default:
        break;
    }
  }

  function expandAll(): void {
    setExpanded(new Set(all.filter((f) => 'branches' in f.node).map((f) => f.id)));
  }

  function collapseAll(): void {
    setExpanded(new Set());
  }

  const vis = new Set(visibleIds());

  // Précalculé une fois par rendu : évite un filtrage O(n) par nœud (O(n²)
  // au total) dans TreeItem.
  const childrenById = new Map<string, FlatNode[]>();
  for (const f of all) {
    if (f.depth === 1) continue;
    const parentId = f.id.slice(0, f.id.lastIndexOf('-'));
    const siblings = childrenById.get(parentId);
    if (siblings) siblings.push(f);
    else childrenById.set(parentId, [f]);
  }

  return (
    <div>
      <div className="mb-2 flex gap-3 font-mono text-[11px] uppercase tracking-wider">
        <button
          type="button"
          className="motion-safe:transition-colors flex min-h-11 items-center text-brand-600 hover:underline sm:min-h-0 dark:text-brand-300"
          onClick={expandAll}
        >
          Alles aufklappen
        </button>
        <button
          type="button"
          className="motion-safe:transition-colors flex min-h-11 items-center text-slate-500 hover:underline sm:min-h-0 dark:text-slate-400"
          onClick={collapseAll}
        >
          Alles zuklappen
        </button>
      </div>
      <ul role="tree" aria-label="Entscheidungsbaum" className="space-y-1">
        {all
          .filter((f) => f.depth === 1)
          .map((f) => (
            <TreeItem
              key={f.id}
              flat={f}
              childrenById={childrenById}
              isExpanded={isExpanded}
              visible={vis}
              onKeyDown={handleKeyDown}
              onToggle={toggle}
              itemRefs={itemRefs}
              idPrefix={baseId}
            />
          ))}
      </ul>
    </div>
  );
}

function TreeItem({
  flat,
  childrenById,
  isExpanded,
  visible,
  onKeyDown,
  onToggle,
  itemRefs,
  idPrefix,
}: {
  flat: FlatNode;
  childrenById: Map<string, FlatNode[]>;
  isExpanded: (id: string) => boolean;
  visible: Set<string>;
  onKeyDown: (e: React.KeyboardEvent, f: FlatNode) => void;
  onToggle: (id: string, force?: boolean) => void;
  itemRefs: React.MutableRefObject<Map<string, HTMLLIElement>>;
  idPrefix: string;
}) {
  const { node, id, branchLabel, depth } = flat;
  const hasChildren = 'branches' in node;
  const expanded = hasChildren ? isExpanded(id) : undefined;
  const children = hasChildren ? (childrenById.get(id) ?? []) : [];

  const label = hasChildren ? node.question : node.answer;
  const signal = isLeafSignal(node);
  const nodeLabel = signal ? `${label} — Notfall` : label;

  return (
    <li
      role="treeitem"
      aria-expanded={hasChildren ? expanded : undefined}
      aria-label={nodeLabel}
      tabIndex={0}
      data-node={id}
      data-expanded={hasChildren ? String(expanded) : undefined}
      ref={(el) => {
        if (el) itemRefs.current.set(id, el);
        else itemRefs.current.delete(id);
      }}
      onKeyDown={(e) => onKeyDown(e, flat)}
      onClick={hasChildren ? () => onToggle(id) : undefined}
      className="outline-none focus-visible:ring-2 focus-visible:ring-brand-400 rounded-lg"
      style={{ marginLeft: depth > 1 ? '1rem' : 0 }}
    >
      {branchLabel && (
        <div className="mb-1 border-l-2 border-slate-300 pl-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
          {branchLabel}
        </div>
      )}
      {hasChildren ? (
        <NodeBox variant="question" className="cursor-pointer motion-safe:transition-colors">
          <div className="flex items-center justify-between gap-2 text-sm font-medium">
            <span>{node.question}</span>
            <span aria-hidden="true" className="font-mono text-xs text-slate-400">
              {expanded ? '−' : '+'}
            </span>
          </div>
        </NodeBox>
      ) : (
        <NodeBox variant={signal ? 'signal' : 'default'} tone={signal ? 'signal' : 'neutral'}>
          <div className="flex items-start gap-2 text-sm">
            {signal && <ToneMark tone="signal" />}
            <div>
              <div className="font-medium">{node.answer}</div>
              {node.text && <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{node.text}</div>}
            </div>
          </div>
        </NodeBox>
      )}
      {hasChildren && expanded && children.length > 0 && (
        <ul role="group" className="mt-1 space-y-1 border-l border-slate-200 pl-2 dark:border-slate-800">
          {children.map((c) => (
            <TreeItem
              key={c.id}
              flat={c}
              childrenById={childrenById}
              isExpanded={isExpanded}
              visible={visible}
              onKeyDown={onKeyDown}
              onToggle={onToggle}
              itemRefs={itemRefs}
              idPrefix={idPrefix}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
