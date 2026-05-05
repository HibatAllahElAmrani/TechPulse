import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { Contributor } from '../api/client';

interface Props {
  contributors: Contributor[];
}

interface Node extends d3.SimulationNodeDatum, Contributor {
  radius: number;
}

export default function ContributorsBubble({ contributors }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || contributors.length === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 600;
    const height = 320;
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const maxContrib = d3.max(contributors, (c) => c.contributions) ?? 1;
    const rScale = d3.scaleSqrt().domain([0, maxContrib]).range([8, 50]);

    const nodes: Node[] = contributors.slice(0, 30).map((c) => ({
      ...c,
      radius: rScale(c.contributions),
    }));

    const simulation = d3
      .forceSimulation<Node>(nodes)
      .force('charge', d3.forceManyBody().strength(5))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force(
        'collide',
        d3.forceCollide<Node>().radius((d) => d.radius + 2)
      )
      .stop();

    for (let i = 0; i < 200; i++) simulation.tick();

    const g = svg.append('g');

    const groups = g
      .selectAll('g.bubble')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'bubble')
      .attr('transform', (d) => `translate(${d.x},${d.y})`);

    // Create clip paths for circular avatars
    const defs = svg.append('defs');
    nodes.forEach((n, i) => {
      defs
        .append('clipPath')
        .attr('id', `clip-${i}`)
        .append('circle')
        .attr('r', n.radius);
    });

    groups
      .append('circle')
      .attr('r', (d) => d.radius)
      .attr('fill', '#2f81f7')
      .attr('fill-opacity', 0.2)
      .attr('stroke', '#2f81f7')
      .attr('stroke-width', 1.5);

    groups
      .append('image')
      .attr('href', (d) => d.avatar_url)
      .attr('x', (d) => -d.radius)
      .attr('y', (d) => -d.radius)
      .attr('width', (d) => d.radius * 2)
      .attr('height', (d) => d.radius * 2)
      .attr('clip-path', (_d, i) => `url(#clip-${i})`)
      .attr('opacity', 0.85);

    groups.append('title').text((d) => `${d.login}: ${d.contributions} contributions`);
  }, [contributors]);

  return (
    <div className="card">
      <h3 className="font-semibold mb-4">Top Contributors</h3>
      {contributors.length === 0 ? (
        <p className="text-center text-gray-500 text-sm py-12">
          Contributors will appear after the first low-priority collection cycle (~15 min).
        </p>
      ) : (
        <svg ref={svgRef} className="w-full" style={{ maxHeight: 360 }} />
      )}
    </div>
  );
}
