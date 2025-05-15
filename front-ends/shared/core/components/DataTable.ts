/**
 * Core DataTable component interface
 * 
 * Defines the common properties and behavior for DataTable implementations
 * across frameworks.
 */

export type SortDirection = 'asc' | 'desc' | null;

export interface ColumnDefinition<T = any> {
  /** Unique identifier for the column */
  id: string;
  
  /** Header text to display */
  header: string;
  
  /** Property path on the data object to display (nested paths supported with dot notation) */
  accessor?: string | ((row: T) => any);
  
  /** Whether the column can be sorted */
  sortable?: boolean;
  
  /** Whether the column can be filtered */
  filterable?: boolean;
  
  /** Whether the column can be resized */
  resizable?: boolean;
  
  /** Whether the column can be hidden */
  hideable?: boolean;
  
  /** Default sort direction when first clicked */
  defaultSortDirection?: SortDirection;
  
  /** Custom cell renderer function */
  cellRenderer?: (value: any, row: T, index: number) => any;
  
  /** Custom header renderer function */
  headerRenderer?: (column: ColumnDefinition<T>) => any;
  
  /** Column width (in px or %) */
  width?: string | number;
  
  /** Minimum column width (for resizable columns) */
  minWidth?: number;
  
  /** Maximum column width (for resizable columns) */
  maxWidth?: number;
  
  /** Whether to show this column by default */
  visible?: boolean;
  
  /** Text alignment for the column */
  align?: 'left' | 'center' | 'right';
  
  /** CSS class names to apply to the column */
  className?: string;
  
  /** Whether this column allows HTML content */
  allowHTML?: boolean;
  
  /** Data type of the column (used for filtering and sorting) */
  type?: 'string' | 'number' | 'date' | 'boolean' | 'currency';
  
  /** Format options for the column based on its type */
  format?: {
    /** Date format string */
    dateFormat?: string;
    
    /** Number format options */
    numberFormat?: {
      minimumFractionDigits?: number;
      maximumFractionDigits?: number;
      style?: 'decimal' | 'currency' | 'percent';
      currency?: string;
    };
  };
}

export interface PaginationState {
  /** Current page number (1-based) */
  page: number;
  
  /** Number of items per page */
  pageSize: number;
  
  /** Total number of items */
  totalItems: number;
}

export interface SortState {
  /** Column ID to sort by */
  column: string;
  
  /** Sort direction */
  direction: SortDirection;
}

export interface FilterState {
  /** Column ID to filter */
  column: string;
  
  /** Filter value */
  value: any;
  
  /** Filter operator */
  operator?: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'startsWith' | 'endsWith';
}

export interface SelectionState<T = any> {
  /** Selected row IDs */
  selectedIds: Array<string | number>;
  
  /** Selected row objects */
  selectedRows: Array<T>;
  
  /** Whether all rows are selected */
  allSelected: boolean;
}

export interface DataTableEvents<T = any> {
  /** Event when pagination changes */
  onPaginationChange?: (pagination: PaginationState) => void;
  
  /** Event when sorting changes */
  onSortChange?: (sort: SortState) => void;
  
  /** Event when filtering changes */
  onFilterChange?: (filters: FilterState[]) => void;
  
  /** Event when row selection changes */
  onSelectionChange?: (selection: SelectionState<T>) => void;
  
  /** Event when a row is clicked */
  onRowClick?: (row: T, index: number, event: any) => void;
  
  /** Event when a cell is clicked */
  onCellClick?: (value: any, row: T, column: ColumnDefinition<T>, event: any) => void;
}

export interface DataTableProps<T = any> extends DataTableEvents<T> {
  /** Table columns configuration */
  columns: ColumnDefinition<T>[];
  
  /** Data to display in the table */
  data: T[];
  
  /** Unique identifier field in the data */
  idField?: string;
  
  /** Whether to show the table header */
  showHeader?: boolean;
  
  /** Whether to show the pagination component */
  showPagination?: boolean;
  
  /** Whether pagination is handled by the server */
  serverSidePagination?: boolean;
  
  /** Initial pagination state */
  pagination?: PaginationState;
  
  /** Whether to show the search box */
  showSearch?: boolean;
  
  /** Whether to enable row selection */
  selectable?: boolean;
  
  /** Selection mode (single or multiple) */
  selectionMode?: 'single' | 'multiple';
  
  /** Whether to show row hover effect */
  hoverable?: boolean;
  
  /** Whether the table has fixed header */
  fixedHeader?: boolean;
  
  /** Whether the table is in a loading state */
  loading?: boolean;
  
  /** Height of the table (for fixed header) */
  height?: string | number;
  
  /** Text to display when there is no data */
  noDataText?: string;
  
  /** Text to display when loading */
  loadingText?: string;
  
  /** Whether to stripe alternate rows */
  striped?: boolean;
  
  /** Whether to show borders between cells */
  bordered?: boolean;
  
  /** Whether to make the table responsive */
  responsive?: boolean;
  
  /** CSS class names to apply to the table */
  className?: string;
  
  /** Row CSS class function */
  rowClassName?: (row: T, index: number) => string;
  
  /** Initial sort state */
  initialSort?: SortState;
  
  /** Initial filter state */
  initialFilters?: FilterState[];
  
  /** Whether to enable column resizing */
  resizableColumns?: boolean;
  
  /** Whether to enable row expansion */
  expandableRows?: boolean;
  
  /** Custom row expansion renderer */
  expandedRowRenderer?: (row: T, index: number) => any;
  
  /** Whether to enable keyboard navigation */
  keyboardNavigation?: boolean;
  
  /** Whether to enable column reordering */
  reorderableColumns?: boolean;
  
  /** Whether to enable export features */
  exportable?: boolean;
  
  /** Available export formats */
  exportFormats?: Array<'csv' | 'excel' | 'pdf'>;
  
  /** Available page sizes for selection */
  pageSizeOptions?: number[];
}

/**
 * Default DataTable property values
 */
export const defaultDataTableProps: Partial<DataTableProps> = {
  showHeader: true,
  showPagination: true,
  serverSidePagination: false,
  showSearch: true,
  selectable: false,
  selectionMode: 'multiple',
  hoverable: true,
  fixedHeader: false,
  loading: false,
  noDataText: 'No data available',
  loadingText: 'Loading...',
  striped: true,
  bordered: false,
  responsive: true,
  resizableColumns: false,
  expandableRows: false,
  keyboardNavigation: true,
  reorderableColumns: false,
  exportable: false,
  exportFormats: ['csv', 'excel', 'pdf'],
  idField: 'id',
  pageSizeOptions: [10, 25, 50, 100],
  pagination: {
    page: 1,
    pageSize: 10,
    totalItems: 0,
  },
};

/**
 * Common DataTable style guidelines
 */
export const dataTableStyleGuidelines = {
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.875rem',
  },
  
  header: {
    backgroundColor: '#f8fafc', // slate-50
    color: '#334155', // slate-700
    fontWeight: 'bold',
    textAlign: 'left',
    padding: '0.75rem',
    borderBottom: '2px solid #e2e8f0', // slate-200
  },
  
  headerCell: {
    padding: '0.75rem',
  },
  
  row: {
    borderBottom: '1px solid #e2e8f0', // slate-200
  },
  
  cell: {
    padding: '0.75rem',
    verticalAlign: 'middle',
  },
  
  striped: {
    backgroundColor: '#f8fafc', // slate-50
  },
  
  hover: {
    backgroundColor: '#f1f5f9', // slate-100
  },
  
  selected: {
    backgroundColor: 'rgba(79, 162, 219, 0.1)', // mifos primary with opacity
  },
  
  pagination: {
    padding: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTop: '1px solid #e2e8f0', // slate-200
  },
  
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  noData: {
    padding: '2rem',
    textAlign: 'center',
    color: '#64748b', // slate-500
  },
  
  resizeHandle: {
    display: 'inline-block',
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '5px',
    cursor: 'col-resize',
  },
};