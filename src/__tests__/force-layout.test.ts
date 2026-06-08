import { runForceSimulation, LayoutNode, LayoutEdge } from '@/lib/force-layout';

function makeNodes(names: string[], startX = 400, startY = 250): LayoutNode[] {
  return names.map((name, i) => ({
    name,
    x: startX + (i % 3) * 50 - 50,
    y: startY + Math.floor(i / 3) * 50 - 25,
    vx: 0,
    vy: 0,
    relatedCount: names.length - i,
  }));
}

describe('runForceSimulation', () => {
  const config = { width: 800, height: 500 };

  it('所有节点在边界内', () => {
    const nodes = makeNodes(['A', 'B', 'C', 'D', 'E']);
    const edges: LayoutEdge[] = [{ source: 'A', target: 'B', weight: 3 }];
    runForceSimulation(nodes, edges, config);

    for (const node of nodes) {
      expect(node.x).toBeGreaterThanOrEqual(50);
      expect(node.x).toBeLessThanOrEqual(750);
      expect(node.y).toBeGreaterThanOrEqual(50);
      expect(node.y).toBeLessThanOrEqual(450);
    }
  });

  it('空边图也能正常收敛', () => {
    expect(() => runForceSimulation(makeNodes(['A', 'B', 'C']), [], config)).not.toThrow();
  });

  it('节点不会全部塌缩为同一点', () => {
    const nodes = makeNodes(['A', 'B', 'C', 'D', 'E', 'F']);
    const edges: LayoutEdge[] = [
      { source: 'A', target: 'B', weight: 3 },
      { source: 'D', target: 'E', weight: 1 },
    ];
    runForceSimulation(nodes, edges, config);

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i]!.x - nodes[j]!.x;
        const dy = nodes[i]!.y - nodes[j]!.y;
        expect(Math.sqrt(dx * dx + dy * dy)).toBeGreaterThan(5);
      }
    }
  });

  it('强连接节点比无连接节点更近', () => {
    const nodes: LayoutNode[] = [
      { name: 'center', x: 400, y: 250, vx: 0, vy: 0, relatedCount: 2 },
      { name: 'linked', x: 450, y: 250, vx: 0, vy: 0, relatedCount: 1 },
      { name: 'alone', x: 400, y: 300, vx: 0, vy: 0, relatedCount: 0 },
    ];
    const edges: LayoutEdge[] = [
      { source: 'center', target: 'linked', weight: 5 },
    ];
    runForceSimulation(nodes, edges, config);

    const c = nodes.find((n) => n.name === 'center')!;
    const linked = nodes.find((n) => n.name === 'linked')!;
    const alone = nodes.find((n) => n.name === 'alone')!;

    const dLinked = Math.sqrt((c.x - linked.x) ** 2 + (c.y - linked.y) ** 2);
    const dAlone = Math.sqrt((c.x - alone.x) ** 2 + (c.y - alone.y) ** 2);

    expect(dLinked).toBeLessThan(dAlone);
  });

  it('300次迭代后速度衰减收敛', () => {
    const nodes = makeNodes(['A', 'B', 'C', 'D']);
    const edges: LayoutEdge[] = [{ source: 'A', target: 'B', weight: 3 }];
    runForceSimulation(nodes, edges, { ...config, iterations: 300 });

    for (const node of nodes) {
      expect(Math.abs(node.vx)).toBeLessThan(10);
      expect(Math.abs(node.vy)).toBeLessThan(10);
    }
  });
});
