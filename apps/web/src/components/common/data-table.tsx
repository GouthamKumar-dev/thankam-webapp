import {
  MaterialReactTable,
  MRT_ColumnDef,
  useMaterialReactTable,
} from 'material-react-table';

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
}: {
  columns: MRT_ColumnDef<T>[];
  data: T[];
}) {
  const table = useMaterialReactTable({
    columns,
    data,
    enableDensityToggle: false,
    enableColumnFilters: false,
    enableFullScreenToggle: false,
    enableHiding: false,
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
    muiTablePaperProps: {
      elevation: 0,
      sx: {
        borderRadius: '14px',
        border: '1px solid #e8edf5',
        overflow: 'hidden',
      },
    },
    muiTableHeadCellProps: {
      sx: {
        fontSize: '0.78rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '.04em',
        color: '#475569',
        backgroundColor: '#f8fafc',
      },
    },
    muiTableBodyCellProps: {
      sx: {
        fontSize: '0.88rem',
      },
    },
    muiTopToolbarProps: {
      sx: {
        backgroundColor: '#ffffff',
      },
    },
  });

  return <MaterialReactTable table={table} />;
}
