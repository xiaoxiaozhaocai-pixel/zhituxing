// 力导向布局算法（从 skills-graph/page.tsx 抽取为纯函数）

export interface LayoutNode {
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  relatedCount: number;
}

export interface LayoutEdge {
  source: string;
  target: string;
  weight: number;
}

export interface LayoutConfig {
  width: number;
  height: number;
  iterations?: number;
  idealEdgeLen?: number;
}

/**
 * 运行力导向模拟，原地修改 nodes
 * 返回收敛结果（迭代后节点位置稳定）
 */
export function runForceSimulation(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  config: LayoutConfig
): LayoutNode[] {
  const { width: W, height: H, iterations = 300, idealEdgeLen = 150 } = config;

  for (let iter = 0; iter < iterations; iter++) {
    const alpha = 1 - iter / iterations;
    const progress = iter / iterations;

    // 斥力：库仑力（节点之间）
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]!, b = nodes[j]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = 2000 * alpha / (dist * dist + 1);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx -= fx; a.vy -= fy;
        b.vx += fx; b.vy -= fy;
      }
    }

    // 引力：边（多级弹力）
    for (const edge of edges) {
      const src = nodes.find((n) => n.name === edge.source);
      const tgt = nodes.find((n) => n.name === edge.target);
      if (!src || !tgt) continue;
      const dx = tgt.x - src.x;
      const dy = tgt.y - src.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const targetLen = idealEdgeLen / Math.sqrt(edge.weight);
      const force = (dist - targetLen) * 0.02 * alpha * edge.weight;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      src.vx += fx; src.vy += fy;
      tgt.vx -= fx; tgt.vy -= fy;
    }

    // 中心引力
    for (const node of nodes) {
      node.vx += (W / 2 - node.x) * 0.003 * alpha;
      node.vy += (H / 2 - node.y) * 0.003 * alpha;
    }

    // 速度衰减 + 位置更新
    const decay = 0.65 + progress * 0.2;
    for (const node of nodes) {
      node.vx *= decay;
      node.vy *= decay;
      node.x += node.vx;
      node.y += node.vy;
      // 边界约束
      node.x = Math.max(50, Math.min(W - 50, node.x));
      node.y = Math.max(50, Math.min(H - 50, node.y));
    }
  }

  return nodes;
}
