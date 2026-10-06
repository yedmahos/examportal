import React from 'react';
import './DashboardComponents.css';

const AdminTrendChart = ({ data = [] }) => {
  if (!data || data.length === 0) return null;

  const width = 680;
  const height = 230;
  const paddingLeft = 40;
  const paddingRight = 30;
  const paddingTop = 25;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxY = 50;

  const getY = (val) => {
    return paddingTop + chartHeight - (val / maxY) * chartHeight;
  };

  const getX = (idx) => {
    if (data.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (idx / (data.length - 1)) * chartWidth;
  };

  const scheduledPoints = data.map((d, i) => `${getX(i)},${getY(d.scheduled)}`);
  const completedPoints = data.map((d, i) => `${getX(i)},${getY(d.completed)}`);

  const scheduledPath = `M ${scheduledPoints.join(' L ')}`;
  const completedPath = `M ${completedPoints.join(' L ')}`;

  const areaPath = `${scheduledPath} L ${getX(data.length - 1)},${paddingTop + chartHeight} L ${getX(0)},${paddingTop + chartHeight} Z`;

  const yTicks = [0, 10, 20, 30, 40, 50];

  return (
    <div className="performance-chart-wrapper">
      <svg viewBox={`0 0 ${width} ${height}`} className="performance-svg" preserveAspectRatio="xMidYMid meet">
        {yTicks.map(t => {
          const y = getY(t);
          return (
            <g key={`t-${t}`}>
              <line
                className="chart-grid-line"
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                strokeWidth="1"
              />
              <text x={paddingLeft - 8} y={y + 4} textAnchor="end" className="chart-axis-label">
                {t}
              </text>
            </g>
          );
        })}

        {/* Scheduled Area */}
        <path className="chart-area" d={areaPath} />

        <path
          className="chart-line-completed"
          d={completedPath}
          fill="none"
          strokeWidth="2"
        />

        <path
          className="chart-line-scheduled"
          d={scheduledPath}
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Points */}
        {data.map((d, i) => (
          <g key={`pt-${i}`}>
            <circle className="chart-point-scheduled" cx={getX(i)} cy={getY(d.scheduled)} r={4} strokeWidth="2" />
            <circle className="chart-point-completed" cx={getX(i)} cy={getY(d.completed)} r={3} />
            <text x={getX(i)} y={paddingTop + chartHeight + 20} textAnchor="middle" className="chart-axis-label-x">
              {d.term}
            </text>
          </g>
        ))}
      </svg>

      <div className="chart-legend-row">
        <div className="chart-legend-item">
          <span className="legend-indicator legend-primary" />
          <span className="legend-text">Exams Scheduled</span>
        </div>
        <div className="chart-legend-item">
          <span className="legend-indicator legend-completed" />
          <span className="legend-text">Exams Completed & Verified</span>
        </div>
      </div>
    </div>
  );
};

export default AdminTrendChart;
