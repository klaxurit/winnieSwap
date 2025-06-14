import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import './simpleChart.scss';

interface SimpleChartProps {
  data: { date: string; value: number }[];
  onPriceChange?: (price: number) => void;
}

type ChartType = 'line' | 'candle';

const SimpleChart: React.FC<SimpleChartProps> = ({ data, onPriceChange }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [chartType, setChartType] = useState<ChartType>('line');
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      const { width, height } = containerRef.current!.getBoundingClientRect();
      setDimensions({ width, height });
    };

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    resizeObserver.observe(containerRef.current);
    updateDimensions();

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!svgRef.current || !data.length || dimensions.width === 0) return;
    updateChart(dimensions.width, dimensions.height);
  }, [data, chartType, dimensions]);

  const updateChart = (containerWidth: number, containerHeight: number) => {
    if (!svgRef.current || !data.length) return;

    const svg = d3.select(svgRef.current)
      .attr('width', containerWidth)
      .attr('height', containerHeight);

    // Marges adaptatives basées sur la taille du conteneur
    const margin = {
      top: Math.max(20, containerHeight * 0.05),
      right: Math.max(40, containerWidth * 0.1),
      bottom: Math.max(30, containerHeight * 0.08),
      left: Math.max(40, containerWidth * 0.1)
    };

    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    // Créer les échelles
    const x = d3.scaleTime()
      .domain(d3.extent(data, d => new Date(d.date)) as [Date, Date])
      .range([margin.left, width + margin.left]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value) as number])
      .nice()
      .range([height + margin.top, margin.top]);

    // Nettoyer le SVG
    svg.selectAll("*").remove();

    if (chartType === 'line') {
      // Créer la ligne
      const line = d3.line<{ date: string; value: number }>()
        .x(d => x(new Date(d.date)))
        .y(d => y(d.value))
        .curve(d3.curveMonotoneX);

      // Créer l'aire sous la ligne
      const area = d3.area<{ date: string; value: number }>()
        .x(d => x(new Date(d.date)))
        .y0(height + margin.top)
        .y1(d => y(d.value))
        .curve(d3.curveMonotoneX);

      // Ajouter l'aire
      svg.append('path')
        .datum(data)
        .attr('fill', 'rgba(0, 81, 254, 0.1)')
        .attr('d', area);

      // Ajouter la ligne
      svg.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', '#0051FE')
        .attr('stroke-width', Math.max(2, containerWidth * 0.002))
        .attr('d', line);
    } else {
      // Créer les bougies
      const candleWidth = Math.max(2, width / data.length * 0.8);

      svg.selectAll('rect')
        .data(data)
        .enter()
        .append('rect')
        .attr('x', d => x(new Date(d.date)) - candleWidth / 2)
        .attr('y', d => y(d.value))
        .attr('width', candleWidth)
        .attr('height', d => height + margin.top - y(d.value))
        .attr('fill', '#00FFA3')
        .attr('rx', Math.max(1, candleWidth * 0.1));
    }

    // Ajouter l'axe X
    const xAxis = d3.axisBottom(x)
      .ticks(Math.min(6, Math.floor(width / 100)))
      .tickFormat(d3.timeFormat('%b %d') as any)
      .tickSize(0);

    const xAxisGroup = svg.append('g')
      .attr('transform', `translate(0,${height + margin.top})`)
      .call(xAxis);

    xAxisGroup.selectAll('.domain').remove();
    xAxisGroup.selectAll('text')
      .attr('class', 'SimpleChart__axis-text')
      .attr('dy', '1em')
      .style('font-size', `${Math.max(12, containerWidth * 0.012)}px`)
      .style('fill', 'rgba(255, 255, 255, 0.6)')
      .attr('text-anchor', 'middle')
      .attr('transform', `translate(-15, ${margin.bottom - 20})`);

    // Ajouter l'axe Y à droite
    const yAxis = d3.axisRight(y)
      .ticks(Math.min(6, Math.floor(height / 50)))
      .tickFormat(d => d3.format('$.2f')(d as number))
      .tickSize(0);

    const yAxisGroup = svg.append('g')
      .attr('transform', `translate(${width + margin.left},0)`)
      .call(yAxis);

    yAxisGroup.selectAll('.domain').remove();
    yAxisGroup.selectAll('text')
      .attr('class', 'SimpleChart__axis-text')
      .attr('dx', '0.5em')
      .style('font-size', `${Math.max(12, containerWidth * 0.012)}px`)
      .style('fill', 'rgba(255, 255, 255, 0.6)')
      .attr('text-anchor', 'start')
      .attr('transform', `translate(${margin.right - 60}, -10)`);

    // Ajouter une grille horizontale avec des points
    const gridLines = svg.append('g')
      .attr('class', 'grid-lines');

    gridLines.selectAll('line')
      .data(y.ticks(Math.min(6, Math.floor(height / 50))))
      .enter()
      .append('line')
      .attr('x1', margin.left)
      .attr('x2', width + margin.left)
      .attr('y1', d => y(d as number))
      .attr('y2', d => y(d as number))
      .attr('stroke', 'rgba(255, 255, 255, 0.2)')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '1,25');

    // Ajouter les points interactifs
    const pointRadius = Math.max(3, containerWidth * 0.005);
    const points = svg.selectAll('.point')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'point')
      .attr('cx', d => x(new Date(d.date)))
      .attr('cy', d => y(d.value))
      .attr('r', pointRadius)
      .attr('fill', '#0051FE')
      .style('opacity', 0)
      .on('mouseover', function (event, d) {
        d3.select(this)
          .style('opacity', 1)
          .attr('r', pointRadius * 1.5);

        if (onPriceChange) {
          onPriceChange(d.value);
        }
      })
      .on('mouseout', function () {
        d3.select(this)
          .style('opacity', 0)
          .attr('r', pointRadius);
      });
  };

  return (
    <div className="SimpleChart" ref={containerRef}>
      <svg ref={svgRef} className="SimpleChart__SVG"></svg>
    </div>
  );
};

export default SimpleChart; 