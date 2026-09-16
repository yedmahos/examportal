import React, { useState } from 'react';
import './DashboardComponents.css';

const PerformanceChart = ({ data = [] }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  if (!data || data.length === 0) return null;

  // Chart dimensions
  const width = 680;
  const height = 240;
  const paddingLeft = 40;
  const paddingRight = 30;
  const paddingTop = 25;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const minY = 1.0;
  const maxY = 4.0;

  const getY = (val) => {
    const clamped = Math.max(minY, Math.min(maxY, val));
    return paddingTop + chartHeight - ((clamped - minY) / (maxY - minY)) * chartHeight;
  };

  const getX = (idx) => {
    if (data.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (idx / (data.length - 1)) * chartWidth;
  };

  // Generate SVG path for your GPA (solid)
  const gpaPoints = data.map((d, i) => `${getX(i)},${getY(d.gpa)}`);
  const gpaPath = `M ${gpaPoints.join(' L ')}`;

  // Area path for gradient fill
  const areaPath = `${gpaPath} L ${getX(data.length - 1)},${paddingTop + chartHeight} L ${getX(0)},${paddingTop + chartHeight} Z`;

  // Generate SVG path for Average GPA (dashed)
  const avgPoints = data.map((d, i) => `${getX(i)},${getY(d.averageGpa)}`);
  const avgPath = `M ${avgPoints.join(' L ')}`;

  const yTicks = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0];

  return (
    <div className="performance-chart-wrapper">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="performance-svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="gpaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6C5DD3" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#6C5DD3" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines and Y-axis labels */}
        {yTicks.map((tick) => {
          const y = getY(tick);
          return (
            <g key={`ytick-${tick}`}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                stroke="#EEF0F4"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={paddingLeft - 8}
                y={y + 4}
                textAnchor="end"
                className="chart-axis-label"
              >
                {tick.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Gradient Area Fill under Your GPA */}
        <path d={areaPath} fill="url(#gpaGradient)" />

        {/* Average GPA Line (Dashed coral) */}
        <path
          d={avgPath}
          fill="none"
          stroke="#F45B69"
          strokeWidth="2"
          strokeDasharray="4 4"
          strokeLinecap="round"
        />

        {/* Your GPA Line (Solid Indigo) */}
        <path
          d={gpaPath}
          fill="none"
          stroke="#6C5DD3"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points for Your GPA */}
        {data.map((d, i) => {
          const cx = getX(i);
          const cy = getY(d.gpa);
          const isHovered = hoveredIndex === i;

          return (
            <g key={`pt-${i}`} className="chart-point-group">
              <circle
                cx={cx}
                cy={cy}
                r={isHovered ? 6 : 4}
                fill="#FFFFFF"
                stroke="#6C5DD3"
                strokeWidth="2.5"
                className="chart-point"
              />
              {/* Invisible larger target for easy hovering */}
              <circle
                cx={cx}
                cy={cy}
                r={16}
                fill="transparent"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{ cursor: 'pointer' }}
              />
              {/* X-axis label */}
              <text
                x={cx}
                y={paddingTop + chartHeight + 20}
                textAnchor="middle"
                className="chart-axis-label-x"
              >
                {d.semester.replace(' Semester', ' Sem')}
              </text>
            </g>
          );
        })}

        {/* Data points for Average GPA */}
        {data.map((d, i) => (
          <circle
            key={`avg-pt-${i}`}
            cx={getX(i)}
            cy={getY(d.averageGpa)}
            r={3}
            fill="#F45B69"
          />
        ))}

        {/* Hover Tooltip Box */}
        {hoveredIndex !== null && (
          <g transform={`translate(${getX(hoveredIndex)}, ${Math.min(getY(data[hoveredIndex].gpa) - 45, height - 70)})`}>
            {/* Tooltip Background */}
            <rect
              x="-65"
              y="-15"
              width="130"
              height="52"
              rx="8"
              fill="#FFFFFF"
              stroke="#EEF0F4"
              strokeWidth="1"
              filter="drop-shadow(0 4px 8px rgba(0,0,0,0.08))"
            />
            <text x="0" y="0" textAnchor="middle" className="chart-tooltip-title">
              {data[hoveredIndex].semester}
            </text>
            <circle cx="-42" cy="14" r="3" fill="#6C5DD3" />
            <text x="-32" y="18" className="chart-tooltip-text">
              Your: <tspan fontWeight="700">{data[hoveredIndex].gpa.toFixed(2)}</tspan>
            </text>
            <circle cx="16" cy="14" r="3" fill="#F45B69" />
            <text x="26" y="18" className="chart-tooltip-text">
              Avg: <tspan fontWeight="700">{data[hoveredIndex].averageGpa.toFixed(2)}</tspan>
            </text>
          </g>
        )}
      </svg>

      {/* Legend under/top */}
      <div className="chart-legend-row">
        <div className="chart-legend-item">
          <span className="legend-indicator legend-primary" />
          <span className="legend-text">Your GPA Trend</span>
        </div>
        <div className="chart-legend-item">
          <span className="legend-indicator legend-secondary" />
          <span className="legend-text">Cohort Average GPA</span>
        </div>
      </div>
    </div>
  );
};

export default PerformanceChart;
