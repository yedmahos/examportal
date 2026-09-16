import React from 'react';
import './Tabs.css';

const Tabs = ({
  tabs = [], // [{ id, label, count }]
  activeTab,
  onChange,
  variant = 'pill', // 'pill' | 'underline'
  className = '',
}) => {
  return (
    <div className={`tabs-container tabs-${variant} ${className}`} role="tablist">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`tab-btn ${isActive ? 'active' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            <span className="tab-label">{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`tab-count ${isActive ? 'count-active' : ''}`}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
