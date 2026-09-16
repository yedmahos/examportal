import React from 'react';
import Skeleton from './Skeleton';
import EmptyState from './EmptyState';
import Pagination from './Pagination';
import './DataTable.css';

const DataTable = ({
  columns = [], // [{ key, title, align, width, render }]
  data = [],
  keyField = 'id',
  isLoading = false,
  emptyTitle = 'No data available',
  emptyDescription = 'There are no records matching your request.',
  emptyAction,
  pagination, // { page, totalPages, total, onPageChange, limit }
  onRowClick,
  className = '',
}) => {
  return (
    <div className={`data-table-container ${className}`}>
      <div className="table-responsive">
        <table className="custom-data-table">
          <thead>
            <tr>
              {columns.map((col, index) => (
                <th
                  key={col.key || index}
                  style={{
                    textAlign: col.align || 'left',
                    width: col.width || 'auto',
                  }}
                  className="table-th"
                >
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={`skel-row-${rIdx}`} className="skeleton-row">
                  {columns.map((col, cIdx) => (
                    <td key={`skel-cell-${cIdx}`} className="table-td">
                      <Skeleton width={cIdx === 0 ? '70%' : '50%'} height="18px" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="table-empty-td">
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    action={emptyAction}
                  />
                </td>
              </tr>
            ) : (
              data.map((row, rIdx) => (
                <tr
                  key={row[keyField] || rIdx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`table-row ${onRowClick ? 'clickable' : ''}`}
                >
                  {columns.map((col, cIdx) => (
                    <td
                      key={col.key || cIdx}
                      style={{ textAlign: col.align || 'left' }}
                      className="table-td"
                    >
                      {col.render ? col.render(row[col.key], row, rIdx) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && !isLoading && data.length > 0 && (
        <div className="table-pagination-footer">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            pageSize={pagination.limit}
            onPageChange={pagination.onPageChange}
          />
        </div>
      )}
    </div>
  );
};

export default DataTable;
