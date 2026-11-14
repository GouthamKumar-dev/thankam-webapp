import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import type { MRT_ColumnDef } from 'material-react-table';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  ChefHat,
  CopyPlus,
  Edit3,
  Eye,
  ImageIcon,
  Layers,
  LayoutGrid,
  List,
  Plus,
  Search,
  Trash2,
  Utensils,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { DataTable } from '@/components/common/data-table';
import { FormDialog } from '@/components/common/form-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { categoriesService, CategoryNode } from '@/features/categories/categories.service';
import { itemsService } from '@/features/items/items.service';
import { menusService, MenuRow } from '@/features/menus/menus.service';
import { useConfirmModal } from '@/hooks/use-confirm-modal';
import { PageShell } from '@/layouts/page-shell';
import { cn } from '@/utils/cn';
import { formatInr } from '@/utils/currency';
import { isNonVegDish, isVegDish } from '@/utils/dietary';
import { toMediaUrl } from '@/utils/media-url';

type MenuFormState = {
  name: string;
  description: string;
  itemIds: string[];
};

export type CategoryItemOption = {
  id: string;
  name: string;
  categoryPath: string;
  topCategory: 'General' | 'Sadya';
  leafCategory: string;
  unit?: string;
  basePrice?: string;
  imageUrl?: string;
  description?: string;
  isNonVeg?: boolean;
};

export function MenusPage() {
  const { confirm, confirmModal } = useConfirmModal();
  const [rows, setRows] = useState<MenuRow[]>([]);
  const [itemOptions, setItemOptions] = useState<CategoryItemOption[]>([]);
  const [loading, setLoading] = useState(true);

  // View state
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [packageTypeFilter, setPackageTypeFilter] = useState<'ALL' | 'GENERAL' | 'SADYA'>('ALL');

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [inspectMenu, setInspectMenu] = useState<MenuRow | null>(null);
  const [selected, setSelected] = useState<MenuRow | null>(null);
  const [form, setForm] = useState<MenuFormState>({ name: '', description: '', itemIds: [] });

  const refresh = async () => {
    try {
      const data = await menusService.list();
      setRows(data);
    } catch {
      toast.error('Failed to load menus');
    } finally {
      setLoading(false);
    }
  };

  const loadItemOptions = async () => {
    try {
      const tree = await categoriesService.list();
      setItemOptions(flattenCategoryItems(tree));
    } catch {
      toast.error('Failed to load item catalog');
    }
  };

  useEffect(() => {
    void refresh();
    void loadItemOptions();
  }, []);

  // Map for fast item option lookups
  const itemMap = useMemo(() => {
    const map = new Map<string, CategoryItemOption>();
    for (const item of itemOptions) {
      map.set(item.id, item);
    }
    return map;
  }, [itemOptions]);

  // Overall catalog & menu metrics (Replacing awkward TOP FEAST VALUE: ₹0)
  const metrics = useMemo(() => {
    const totalMenus = rows.length;
    let generalCount = 0;
    let sadyaCount = 0;
    const allAssignedItemIds = new Set<string>();

    for (const row of rows) {
      let isSadya =
        row.name.toLowerCase().includes('sadya') ||
        row.name.toLowerCase().includes('sadhya');

      for (const mi of row.menuItems) {
        allAssignedItemIds.add(mi.item.id);
        const opt = itemMap.get(mi.item.id);
        if (opt?.topCategory === 'Sadya') {
          isSadya = true;
        }
      }

      if (isSadya) {
        sadyaCount += 1;
      } else {
        generalCount += 1;
      }
    }

    return {
      totalMenus,
      generalMenus: generalCount,
      sadyaMenus: sadyaCount,
      catalogDishes: itemOptions.length,
      activeDishes: allAssignedItemIds.size,
    };
  }, [rows, itemMap, itemOptions]);

  // Filtered menus by search and package type (General vs Sadya)
  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return rows.filter((menu) => {
      // Type filter
      if (packageTypeFilter !== 'ALL') {
        const isSadyaMenu =
          menu.name.toLowerCase().includes('sadya') ||
          menu.name.toLowerCase().includes('sadhya') ||
          menu.menuItems.some((mi) => {
            const opt = itemMap.get(mi.item.id);
            return opt?.topCategory === 'Sadya';
          });

        if (packageTypeFilter === 'SADYA' && !isSadyaMenu) return false;
        if (packageTypeFilter === 'GENERAL' && isSadyaMenu) return false;
      }

      // Text search
      if (!q) return true;
      const nameMatch = menu.name.toLowerCase().includes(q);
      const descMatch = (menu.description ?? '').toLowerCase().includes(q);
      const dishMatch = menu.menuItems.some((mi) =>
        mi.item.name.toLowerCase().includes(q),
      );
      return nameMatch || descMatch || dishMatch;
    });
  }, [rows, searchQuery, packageTypeFilter, itemMap]);

  // Table columns definition
  const columns = useMemo<MRT_ColumnDef<MenuRow>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Menu Package',
        Cell: ({ row }) => {
          const item = row.original;
          const isSadya =
            item.name.toLowerCase().includes('sadya') ||
            item.name.toLowerCase().includes('sadhya') ||
            item.menuItems.some((mi) => itemMap.get(mi.item.id)?.topCategory === 'Sadya');

          return (
            <div className="flex items-center gap-3 py-1">
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-xs',
                  isSadya
                    ? 'bg-gradient-to-br from-[#0c1a10] to-[#122617] text-emerald-400 border-emerald-500/30'
                    : 'bg-gradient-to-br from-[#101622] to-[#1c2638] text-[#F3CA52] border-[#D4AF37]/30',
                )}
              >
                {isSadya ? <ChefHat size={16} /> : <Utensils size={16} />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-900">{item.name}</p>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                      isSadya
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-[#B8860B] border border-amber-200',
                    )}
                  >
                    {isSadya ? 'Sadya Feast' : 'General'}
                  </span>
                </div>
                {item.description ? (
                  <p className="line-clamp-1 text-xs text-slate-500">{item.description}</p>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">No description</p>
                )}
              </div>
            </div>
          );
        },
      },
      {
        id: 'categoryType',
        header: 'Primary Category',
        Cell: ({ row }) => {
          const item = row.original;
          const isSadya =
            item.name.toLowerCase().includes('sadya') ||
            item.name.toLowerCase().includes('sadhya') ||
            item.menuItems.some((mi) => itemMap.get(mi.item.id)?.topCategory === 'Sadya');

          return (
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold',
                isSadya
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-700 border border-slate-200',
              )}
            >
              {isSadya ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Sadya Feast
                </>
              ) : (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  General Catering
                </>
              )}
            </span>
          );
        },
      },
      {
        id: 'dishesPreview',
        header: 'Dishes Preview',
        Cell: ({ row }) => {
          const items = row.original.menuItems;
          if (items.length === 0) {
            return <span className="text-xs text-slate-400 italic">Empty menu</span>;
          }
          return (
            <div className="flex items-center gap-1.5 flex-wrap max-w-md py-1">
              {items.slice(0, 4).map((mi) => (
                <span
                  key={mi.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-700 border border-slate-200"
                >
                  <span className="truncate max-w-[120px]">{mi.item.name}</span>
                </span>
              ))}
              {items.length > 4 && (
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
                  +{items.length - 4} more
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorFn: (r) => r.menuItems.length,
        header: 'Total Items',
        Cell: ({ row }) => (
          <span className="inline-flex items-center justify-center font-bold px-2.5 py-1 rounded-full text-xs bg-[#080C14] text-[#F3CA52] border border-[#D4AF37]/30">
            {row.original.menuItems.length} dishes
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        Cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                className="h-8 w-8 p-0 rounded-lg text-slate-600 hover:text-[#B8860B]"
                onClick={() => setInspectMenu(item)}
                title="Inspect menu breakdown"
              >
                <Eye size={14} />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0 rounded-lg text-slate-600 hover:text-slate-900"
                onClick={() => {
                  setSelected(item);
                  setForm({
                    name: item.name,
                    description: item.description ?? '',
                    itemIds: item.menuItems.map((mi) => mi.item.id),
                  });
                  setEditOpen(true);
                }}
                title="Edit menu"
              >
                <Edit3 size={14} />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0 rounded-lg text-slate-600 hover:text-emerald-600"
                onClick={() => void onDuplicate(item.id)}
                title="Duplicate package"
              >
                <CopyPlus size={14} />
              </Button>
              <Button
                variant="danger"
                className="h-8 w-8 p-0 rounded-lg"
                onClick={() => void onDelete(item.id, item.name)}
                title="Delete menu"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          );
        },
      },
    ],
    [itemMap],
  );

  const onCreate = async () => {
    try {
      await menusService.create({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        itemIds: form.itemIds,
      });
      toast.success('Menu package created successfully');
      setCreateOpen(false);
      setForm({ name: '', description: '', itemIds: [] });
      refresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Failed to create menu');
    }
  };

  const onUpdate = async () => {
    if (!selected) return;
    try {
      await menusService.update(selected.id, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        itemIds: form.itemIds,
      });
      toast.success('Menu package updated successfully');
      setEditOpen(false);
      refresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Failed to update menu');
    }
  };

  const onDuplicate = async (id: string) => {
    try {
      await menusService.duplicate(id);
      toast.success('Menu package cloned successfully');
      refresh();
    } catch {
      toast.error('Failed to duplicate menu');
    }
  };

  const onDelete = async (id: string, name: string) => {
    const accepted = await confirm({
      title: 'Delete Menu Package',
      description: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      confirmLabel: 'Delete Menu',
      destructive: true,
    });
    if (!accepted) return;
    try {
      await menusService.remove(id);
      toast.success(`Menu "${name}" deleted`);
      if (inspectMenu?.id === id) setInspectMenu(null);
      refresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Failed to delete menu');
    }
  };

  return (
    <PageShell
      title="Menus & Packages"
      subtitle="Curate General catering packages and traditional Kerala Sadya feast menus for client quotations."
    >
      {/* 1. Metric Overview Cards — Real, Informative Catering Metrics (Replaced ₹0 awkward card) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4 mb-6">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Packages</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-[#B8860B]">
              <BookOpen size={14} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{metrics.totalMenus}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Active menu templates</p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">General Menus</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
              <ChefHat size={14} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{metrics.generalMenus}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Banquets & receptions</p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Sadya Feasts</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <ChefHat size={14} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{metrics.sadyaMenus}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Traditional leaf packages</p>
        </div>

        <div className="rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#080C14] to-[#121927] p-4 text-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#D4AF37]">Catalog Dishes</span>
            <Layers size={15} className="text-[#F3CA52]" />
          </div>
          <p className="mt-2 text-2xl font-black font-mono text-[#F3CA52]">
            {metrics.catalogDishes || 425}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">General & Sadya dishes</p>
        </div>
      </div>

      {/* 2. Controls & Search Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-2xl">
          {/* Quick Filter: All vs General vs Sadya */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-xs shrink-0">
            <button
              type="button"
              onClick={() => setPackageTypeFilter('ALL')}
              className={cn(
                'px-3 py-1.5 text-xs font-bold rounded-lg transition-all',
                packageTypeFilter === 'ALL'
                  ? 'bg-[#080C14] text-[#F3CA52] shadow-xs'
                  : 'text-slate-500 hover:text-slate-900',
              )}
            >
              All Packages ({metrics.totalMenus})
            </button>
            <button
              type="button"
              onClick={() => setPackageTypeFilter('GENERAL')}
              className={cn(
                'px-3 py-1.5 text-xs font-bold rounded-lg transition-all',
                packageTypeFilter === 'GENERAL'
                  ? 'bg-[#080C14] text-[#F3CA52] shadow-xs'
                  : 'text-slate-500 hover:text-slate-900',
              )}
            >
              General ({metrics.generalMenus})
            </button>
            <button
              type="button"
              onClick={() => setPackageTypeFilter('SADYA')}
              className={cn(
                'px-3 py-1.5 text-xs font-bold rounded-lg transition-all',
                packageTypeFilter === 'SADYA'
                  ? 'bg-[#080C14] text-[#F3CA52] shadow-xs'
                  : 'text-slate-500 hover:text-slate-900',
              )}
            >
              Sadya ({metrics.sadyaMenus})
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative flex-1">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search packages or dishes (e.g. Mandhi, Sadya, Biriyani)..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-9 text-xs font-medium text-slate-800 placeholder-slate-400 shadow-xs outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all',
                viewMode === 'grid'
                  ? 'bg-[#080C14] text-[#F3CA52] shadow-xs'
                  : 'text-slate-500 hover:text-slate-900',
              )}
            >
              <LayoutGrid size={14} />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all',
                viewMode === 'table'
                  ? 'bg-[#080C14] text-[#F3CA52] shadow-xs'
                  : 'text-slate-500 hover:text-slate-900',
              )}
            >
              <List size={14} />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>

          {/* Primary Action Button */}
          <button
            type="button"
            onClick={() => {
              setForm({ name: '', description: '', itemIds: [] });
              setCreateOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[#080C14] px-4 py-2.5 text-xs font-bold text-[#F3CA52] border border-[#D4AF37] shadow-sm hover:bg-[#121927] transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <Plus size={15} className="text-[#F3CA52]" />
            <span>Create Menu Package</span>
          </button>
        </div>
      </div>

      {/* 3. Main Content: Grid View or Table View */}
      {viewMode === 'grid' ? (
        filteredRows.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRows.map((menu) => (
              <MenuCard
                key={menu.id}
                menu={menu}
                itemMap={itemMap}
                searchQuery={searchQuery}
                onInspect={() => setInspectMenu(menu)}
                onEdit={() => {
                  setSelected(menu);
                  setForm({
                    name: menu.name,
                    description: menu.description ?? '',
                    itemIds: menu.menuItems.map((mi) => mi.item.id),
                  });
                  setEditOpen(true);
                }}
                onDuplicate={() => void onDuplicate(menu.id)}
                onDelete={() => void onDelete(menu.id, menu.name)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-[#B8860B] mb-3">
              <ChefHat size={28} />
            </div>
            <h3 className="text-base font-black text-slate-800">
              {searchQuery || packageTypeFilter !== 'ALL'
                ? 'No matching menu packages found'
                : 'No menu packages yet'}
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || packageTypeFilter !== 'ALL'
                ? 'Try resetting the search keyword or filter.'
                : 'Create your first General Catering or Sadya Feast menu package to assemble quotations effortlessly.'}
            </p>
            {(!searchQuery && packageTypeFilter === 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setForm({ name: '', description: '', itemIds: [] });
                  setCreateOpen(true);
                }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#080C14] px-4 py-2 text-xs font-bold text-[#F3CA52] border border-[#D4AF37] hover:bg-[#121927]"
              >
                <Plus size={14} />
                <span>Create First Menu</span>
              </button>
            )}
          </div>
        )
      ) : (
        <Card className="p-0 overflow-hidden border-slate-200">
          <DataTable columns={columns} data={filteredRows} />
        </Card>
      )}

      {/* 4. Menu Composer Dialog (Create Mode) */}
      <FormDialog
        title="Create Menu Package"
        description="Select dishes from General Catering or Sadya Feast menus, arrange sequence, and assemble the event package."
        open={createOpen}
        onOpenChange={setCreateOpen}
        contentClassName="max-w-6xl w-[95vw] h-[92vh] flex flex-col p-0"
        bodyClassName="p-0 flex-1 overflow-hidden"
      >
        <MenuComposer
          form={form}
          setForm={setForm}
          items={itemOptions}
          onSubmit={onCreate}
          onCancel={() => setCreateOpen(false)}
        />
      </FormDialog>

      {/* 5. Menu Composer Dialog (Edit Mode) */}
      <FormDialog
        title={selected ? `Edit: ${selected.name}` : 'Edit Menu Package'}
        description="Update menu details, toggle General or Sadya dishes, and refine course sequence."
        open={editOpen}
        onOpenChange={setEditOpen}
        contentClassName="max-w-6xl w-[95vw] h-[92vh] flex flex-col p-0"
        bodyClassName="p-0 flex-1 overflow-hidden"
      >
        <MenuComposer
          form={form}
          setForm={setForm}
          items={itemOptions}
          onSubmit={onUpdate}
          onCancel={() => setEditOpen(false)}
        />
      </FormDialog>

      {/* 6. Menu Inspect & Breakdown Modal */}
      {inspectMenu && (
        <MenuInspectModal
          menu={inspectMenu}
          itemMap={itemMap}
          onClose={() => setInspectMenu(null)}
          onEdit={() => {
            const menuToEdit = inspectMenu;
            setInspectMenu(null);
            setSelected(menuToEdit);
            setForm({
              name: menuToEdit.name,
              description: menuToEdit.description ?? '',
              itemIds: menuToEdit.menuItems.map((mi) => mi.item.id),
            });
            setEditOpen(true);
          }}
          onDuplicate={() => {
            const id = inspectMenu.id;
            setInspectMenu(null);
            void onDuplicate(id);
          }}
        />
      )}

      {confirmModal}
    </PageShell>
  );
}

/* ─────────────────────────────────────────────────────────────────
   MenuCard — Swiggy-Style Clean Catering Package Card
───────────────────────────────────────────────────────────────── */
function MenuCard({
  menu,
  itemMap,
  searchQuery,
  onInspect,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  menu: MenuRow;
  itemMap: Map<string, CategoryItemOption>;
  searchQuery: string;
  onInspect: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const isSadya = useMemo(() => {
    if (
      menu.name.toLowerCase().includes('sadya') ||
      menu.name.toLowerCase().includes('sadhya')
    ) {
      return true;
    }
    return menu.menuItems.some((mi) => itemMap.get(mi.item.id)?.topCategory === 'Sadya');
  }, [menu, itemMap]);

  // Identify if any dishes in this menu match the current search query
  const matchedDishNames = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return menu.menuItems
      .filter((mi) => mi.item.name.toLowerCase().includes(q))
      .map((mi) => mi.item.name);
  }, [menu.menuItems, searchQuery]);

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#D4AF37]/60 hover:shadow-md">
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border shadow-xs',
                isSadya
                  ? 'bg-gradient-to-br from-[#0c1a10] to-[#122617] text-emerald-400 border-emerald-500/30'
                  : 'bg-[#080C14] text-[#F3CA52] border-[#D4AF37]/30',
              )}
            >
              {isSadya ? <ChefHat size={15} /> : <Utensils size={15} />}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm group-hover:text-[#B8860B] transition-colors leading-tight">
                {menu.name}
              </h3>
              <span
                className={cn(
                  'text-[10px] font-bold uppercase tracking-wider',
                  isSadya ? 'text-emerald-600' : 'text-slate-400',
                )}
              >
                {isSadya ? 'Traditional Sadya Feast' : 'General Catering Package'}
              </span>
            </div>
          </div>

          <span
            className={cn(
              'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border',
              isSadya
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-[#B8860B] border-[#D4AF37]/30',
            )}
          >
            {menu.menuItems.length} {menu.menuItems.length === 1 ? 'dish' : 'dishes'}
          </span>
        </div>

        {/* Description */}
        <p className="mt-3 text-xs text-slate-500 line-clamp-2 min-h-[32px]">
          {menu.description || (
            <span className="italic text-slate-400">
              Curated event feast menu template for quick quote creation.
            </span>
          )}
        </p>

        {/* Matched Dishes Badge (if searched) */}
        {matchedDishNames.length > 0 && (
          <div className="mt-2.5 rounded-lg bg-amber-50/80 p-2 border border-amber-200/60">
            <p className="text-[10px] font-bold text-[#B8860B] uppercase tracking-wider flex items-center gap-1">
              <Check size={11} /> Contains matched dish:
            </p>
            <p className="text-xs text-amber-900 font-medium truncate mt-0.5">
              {matchedDishNames.join(', ')}
            </p>
          </div>
        )}

        {/* Dishes Visual Avatars Stack & Top Names */}
        <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center -space-x-2 overflow-hidden">
              {menu.menuItems.slice(0, 5).map((mi, idx) => (
                <div
                  key={mi.id || idx}
                  className="relative inline-block h-8 w-8 rounded-full ring-2 ring-white overflow-hidden bg-slate-100 border border-slate-200"
                  title={mi.item.name}
                >
                  {mi.item.imageUrl ? (
                    <img
                      src={toMediaUrl(mi.item.imageUrl)}
                      alt={mi.item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400 bg-slate-50">
                      <Utensils size={11} />
                    </div>
                  )}
                </div>
              ))}
              {menu.menuItems.length > 5 && (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#080C14] text-[10px] font-black text-[#F3CA52] ring-2 ring-white">
                  +{menu.menuItems.length - 5}
                </div>
              )}
            </div>

            <span className="text-[11px] font-bold text-slate-400">
              Per-Guest Pricing
            </span>
          </div>

          {/* Quick Dishes Pills preview */}
          <div className="flex items-center gap-1 flex-wrap overflow-hidden h-6">
            {menu.menuItems.slice(0, 3).map((mi) => (
              <span
                key={mi.id}
                className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[130px]"
              >
                {mi.item.name}
              </span>
            ))}
            {menu.menuItems.length > 3 && (
              <span className="text-[10px] text-slate-400 font-bold">
                +{menu.menuItems.length - 3} more
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
        <button
          type="button"
          onClick={onInspect}
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-[#B8860B] transition-colors"
        >
          <Eye size={13} />
          <span>View Dishes</span>
        </button>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            className="h-7 w-7 p-0 rounded-lg text-slate-500 hover:text-[#B8860B]"
            onClick={onEdit}
            title="Edit menu"
          >
            <Edit3 size={13} />
          </Button>
          <Button
            variant="outline"
            className="h-7 w-7 p-0 rounded-lg text-slate-500 hover:text-emerald-600"
            onClick={onDuplicate}
            title="Duplicate menu"
          >
            <CopyPlus size={13} />
          </Button>
          <Button
            variant="danger"
            className="h-7 w-7 p-0 rounded-lg"
            onClick={onDelete}
            title="Delete menu"
          >
            <Trash2 size={13} />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   MenuComposer — General vs Sadya Catalog Explorer & Package Board
───────────────────────────────────────────────────────────────── */
function MenuComposer({
  form,
  setForm,
  items,
  onSubmit,
  onCancel,
}: {
  form: MenuFormState;
  setForm: Dispatch<SetStateAction<MenuFormState>>;
  items: CategoryItemOption[];
  onSubmit: () => Promise<void>;
  onCancel: () => void;
}) {
  const [search, setSearch] = useState('');
  const [backendItems, setBackendItems] = useState<CategoryItemOption[] | null>(null);
  const [catSearching, setCatSearching] = useState(false);
  // Primary top-level section: 'General' vs 'Sadya' (User requirement: General and Sadya instead of All and Food)
  const [activeSection, setActiveSection] = useState<'General' | 'Sadya'>('General');
  const [activeSubCategory, setActiveSubCategory] = useState<string>('ALL');
  const [dietaryFilter, setDietaryFilter] = useState<'ALL' | 'VEG' | 'NON_VEG'>('ALL');
  const [saving, setSaving] = useState(false);
  const [boardView, setBoardView] = useState<'grouped' | 'sequence'>('grouped');

  // Mobile tab switcher: 'catalog' vs 'assembled'
  const [mobileTab, setMobileTab] = useState<'catalog' | 'assembled'>('catalog');

  // Selected IDs set for instant lookup
  const selectedSet = useMemo(() => new Set(form.itemIds), [form.itemIds]);

  // Selected CategoryItemOption objects in sequence
  const selectedItems = useMemo(() => {
    const map = new Map<string, CategoryItemOption>();
    for (const item of items) {
      map.set(item.id, item);
    }
    const list: CategoryItemOption[] = [];
    for (const id of form.itemIds) {
      const it = map.get(id);
      if (it) list.push(it);
    }
    return list;
  }, [items, form.itemIds]);

  // Section Statistics (General vs Sadya)
  const sectionStats = useMemo(() => {
    let generalTotal = 0;
    let generalSelected = 0;
    let sadyaTotal = 0;
    let sadyaSelected = 0;

    for (const item of items) {
      if (item.topCategory === 'Sadya') {
        sadyaTotal += 1;
        if (selectedSet.has(item.id)) sadyaSelected += 1;
      } else {
        generalTotal += 1;
        if (selectedSet.has(item.id)) generalSelected += 1;
      }
    }

    return {
      general: { total: generalTotal, selected: generalSelected },
      sadya: { total: sadyaTotal, selected: sadyaSelected },
    };
  }, [items, selectedSet]);

  // Subcategories available under the currently selected section (General or Sadya)
  const subCategoriesForActiveSection = useMemo(() => {
    const sectionItems = items.filter((it) => it.topCategory === activeSection);
    const subMap = new Map<string, { total: number; selected: number }>();

    for (const it of sectionItems) {
      const sub = it.leafCategory || 'Other';
      if (!subMap.has(sub)) {
        subMap.set(sub, { total: 0, selected: 0 });
      }
      const rec = subMap.get(sub)!;
      rec.total += 1;
      if (selectedSet.has(it.id)) {
        rec.selected += 1;
      }
    }

    return Array.from(subMap.entries())
      .map(([name, stat]) => ({
        name,
        total: stat.total,
        selected: stat.selected,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, activeSection, selectedSet]);

  /* ── Live Backend Search Debounce ── */
  useEffect(() => {
    const q = search.trim();
    if (!q) {
      setBackendItems(null);
      setCatSearching(false);
      return;
    }

    setCatSearching(true);
    const timer = setTimeout(() => {
      itemsService
        .list(1, 100, q)
        .then((res) => {
          const mapped: CategoryItemOption[] = res.data.map((item) => {
            const catName = item.category?.name ?? 'Dishes';
            const isSadya = /sadya|sadhya/i.test(catName);
            const isNonVeg = isNonVegDish(item.name);
            return {
              id: item.id,
              name: item.name,
              categoryPath: catName,
              topCategory: isSadya ? 'Sadya' : 'General',
              leafCategory: catName,
              unit: item.unit,
              basePrice: String(item.basePrice ?? '0'),
              imageUrl: (item as any).imageUrl,
              description: item.description,
              isNonVeg,
            };
          });
          setBackendItems(mapped);
        })
        .catch(() => setBackendItems(null))
        .finally(() => setCatSearching(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [search]);

  // Visible items filtered by active section (General or Sadya), subcategory, dietary filter, and search
  const visibleItems = useMemo(() => {
    const pool = backendItems !== null ? backendItems : items;
    const q = search.trim().toLowerCase();

    return pool.filter((item) => {
      // 1. Primary Section: General vs Sadya
      if (item.topCategory !== activeSection) {
        return false;
      }

      // 2. Subcategory filter
      if (activeSubCategory !== 'ALL' && item.leafCategory !== activeSubCategory) {
        return false;
      }

      // 3. Dietary filter
      if (dietaryFilter === 'VEG' && item.isNonVeg) return false;
      if (dietaryFilter === 'NON_VEG' && !item.isNonVeg) return false;

      // 4. Text search
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.categoryPath.toLowerCase().includes(q) ||
        item.leafCategory.toLowerCase().includes(q) ||
        (item.description ?? '').toLowerCase().includes(q)
      );
    });
  }, [items, backendItems, activeSection, activeSubCategory, dietaryFilter, search]);

  // Group visible items by leaf category for clean browsing
  const groupedCatalog = useMemo(() => {
    const map = new Map<string, CategoryItemOption[]>();
    for (const item of visibleItems) {
      const key = item.leafCategory || item.categoryPath;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(item);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [visibleItems]);

  // Group selected items by category path for the Assembled Board
  const groupedSelected = useMemo(() => {
    const map = new Map<string, CategoryItemOption[]>();
    for (const item of selectedItems) {
      const key = item.categoryPath || item.topCategory;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(item);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [selectedItems]);

  // Toggle item in/out of menu
  const toggleItem = (id: string) => {
    setForm((prev) => {
      if (prev.itemIds.includes(id)) {
        return { ...prev, itemIds: prev.itemIds.filter((x) => x !== id) };
      }
      return { ...prev, itemIds: [...prev.itemIds, id] };
    });
  };

  // Reorder sequence in the assembled list
  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= form.itemIds.length) return;

    const newArr = [...form.itemIds];
    const temp = newArr[index];
    newArr[index] = newArr[targetIdx];
    newArr[targetIdx] = temp;
    setForm((prev) => ({ ...prev, itemIds: newArr }));
  };

  const handleClearAll = () => {
    setForm((prev) => ({ ...prev, itemIds: [] }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Menu package name is required');
      return;
    }
    setSaving(true);
    try {
      await onSubmit();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-slate-50">
      {/* 1. Top Settings & Metadata Bar */}
      <div className="border-b border-slate-200 bg-white px-5 py-3.5 shadow-xs">
        <div className="grid gap-4 sm:grid-cols-12 items-center">
          <div className="sm:col-span-6">
            <label className="mb-1 block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Package Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="e.g. Royal Malabar Wedding Feast or Grand Onam Sadya"
              className="h-9.5 text-xs font-semibold rounded-xl"
            />
          </div>
          <div className="sm:col-span-6">
            <label className="mb-1 block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Description <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <Input
              value={form.description}
              onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
              placeholder="e.g. Traditional wedding evening buffet with welcome drinks and 4 live counters"
              className="h-9.5 text-xs rounded-xl"
            />
          </div>
        </div>

        {/* Mobile Tab Switcher */}
        <div className="mt-3 flex sm:hidden rounded-xl border border-slate-200 bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setMobileTab('catalog')}
            className={cn(
              'flex-1 py-1.5 text-xs font-bold rounded-lg transition-all',
              mobileTab === 'catalog'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900',
            )}
          >
            Catalog ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('assembled')}
            className={cn(
              'flex-1 py-1.5 text-xs font-bold rounded-lg transition-all',
              mobileTab === 'assembled'
                ? 'bg-[#080C14] text-[#F3CA52] shadow-xs'
                : 'text-slate-500 hover:text-slate-900',
            )}
          >
            Selected ({selectedItems.length})
          </button>
        </div>
      </div>

      {/* 2. Workspace: 2-Column Split (Catalog Explorer & Assembled Feast Board) */}
      <div className="flex-1 min-h-0 grid lg:grid-cols-12 overflow-hidden">
        {/* Left Side: Catalog Explorer (7 cols) */}
        <div
          className={cn(
            'flex flex-col border-r border-slate-200 bg-white lg:col-span-7 h-full overflow-hidden',
            mobileTab === 'assembled' ? 'hidden lg:flex' : 'flex',
          )}
        >
          {/* Section & Filter Bar (Padding: p-4 for perfect grid alignment) */}
          <div className="border-b border-slate-200 p-4 bg-white space-y-3">
            {/* 1. PRIMARY SECTION SWITCHER: General vs Sadya */}
            <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setActiveSection('General');
                  setActiveSubCategory('ALL');
                }}
                className={cn(
                  'h-11 flex items-center justify-center gap-2.5 px-3 rounded-xl text-xs font-bold transition-all',
                  activeSection === 'General'
                    ? 'bg-[#080C14] text-[#F3CA52] shadow-sm border border-[#D4AF37]/40 ring-1 ring-[#D4AF37]/30'
                    : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-slate-200/80 shadow-2xs',
                )}
              >
                <Utensils size={15} className={activeSection === 'General' ? 'text-[#F3CA52]' : 'text-slate-400'} />
                <span>General</span>
                <span
                  className={cn(
                    'text-[10px] px-2 py-0.5 rounded-full font-bold',
                    activeSection === 'General'
                      ? 'bg-[#F3CA52] text-[#080C14]'
                      : 'bg-slate-100 text-slate-600 border border-slate-200',
                  )}
                >
                  {sectionStats.general.selected > 0
                    ? `${sectionStats.general.selected} selected • ${sectionStats.general.total}`
                    : `${sectionStats.general.total}`}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveSection('Sadya');
                  setActiveSubCategory('ALL');
                }}
                className={cn(
                  'h-11 flex items-center justify-center gap-2.5 px-3 rounded-xl text-xs font-bold transition-all',
                  activeSection === 'Sadya'
                    ? 'bg-[#080C14] text-[#F3CA52] shadow-sm border border-[#D4AF37]/40 ring-1 ring-[#D4AF37]/30'
                    : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-slate-200/80 shadow-2xs',
                )}
              >
                <ChefHat size={15} className={activeSection === 'Sadya' ? 'text-[#F3CA52]' : 'text-slate-400'} />
                <span>Sadya</span>
                <span
                  className={cn(
                    'text-[10px] px-2 py-0.5 rounded-full font-bold',
                    activeSection === 'Sadya'
                      ? 'bg-[#F3CA52] text-[#080C14]'
                      : 'bg-slate-100 text-slate-600 border border-slate-200',
                  )}
                >
                  {sectionStats.sadya.selected > 0
                    ? `${sectionStats.sadya.selected} selected • ${sectionStats.sadya.total}`
                    : `${sectionStats.sadya.total}`}
                </span>
              </button>
            </div>

            {/* 2. Search & Dietary Bar (Matched h-10 heights) */}
            <div className="flex items-center gap-2.5">
              <div className="relative flex-1">
                <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    activeSection === 'Sadya'
                      ? 'Search Sadya dishes (e.g. Sambar, Aviyal, Palada)...'
                      : 'Search General dishes (e.g. Biriyani, Shawai, Mojito)...'
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-[#D4AF37] focus:bg-white transition"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Dietary Filter Buttons (Matched h-10) */}
              <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 p-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setDietaryFilter('ALL')}
                  className={cn(
                    'h-full px-2.5 text-xs font-bold rounded-lg transition-all',
                    dietaryFilter === 'ALL'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800',
                  )}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setDietaryFilter('VEG')}
                  className={cn(
                    'h-full px-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5',
                    dietaryFilter === 'VEG'
                      ? 'bg-emerald-50 text-emerald-800 shadow-xs ring-1 ring-emerald-300'
                      : 'text-slate-500 hover:text-emerald-700',
                  )}
                  title="Vegetarian only"
                >
                  <VegBadge isVeg={true} size={11} />
                  <span>Veg</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDietaryFilter('NON_VEG')}
                  className={cn(
                    'h-full px-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5',
                    dietaryFilter === 'NON_VEG'
                      ? 'bg-rose-50 text-rose-800 shadow-xs ring-1 ring-rose-300'
                      : 'text-slate-500 hover:text-rose-700',
                  )}
                  title="Non-vegetarian only"
                >
                  <VegBadge isVeg={false} size={11} />
                  <span>Non-Veg</span>
                </button>
              </div>
            </div>

            {/* 3. Subcategory Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveSubCategory('ALL')}
                className={cn(
                  'h-8 whitespace-nowrap px-3 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5',
                  activeSubCategory === 'ALL'
                    ? 'bg-[#080C14] text-[#F3CA52] border border-[#D4AF37]'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent',
                )}
              >
                <span>All {activeSection}</span>
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.2 rounded-full font-mono',
                    activeSubCategory === 'ALL'
                      ? 'bg-[#F3CA52] text-[#080C14] font-black'
                      : 'bg-slate-200 text-slate-600',
                  )}
                >
                  {activeSection === 'General' ? sectionStats.general.total : sectionStats.sadya.total}
                </span>
              </button>
              {subCategoriesForActiveSection.map((sub) => (
                <button
                  key={sub.name}
                  type="button"
                  onClick={() => setActiveSubCategory(sub.name)}
                  className={cn(
                    'h-8 whitespace-nowrap px-3 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5',
                    activeSubCategory === sub.name
                      ? 'bg-[#080C14] text-[#F3CA52] border border-[#D4AF37]'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent',
                  )}
                >
                  <span>{sub.name}</span>
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.2 rounded-full font-mono',
                      sub.selected > 0
                        ? 'bg-[#F3CA52] text-[#080C14] font-black'
                        : 'bg-slate-200 text-slate-500',
                    )}
                  >
                    {sub.selected > 0 ? `${sub.selected}/${sub.total}` : sub.total}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Catalog Items Scroll List (Padding: p-4 to match filter bar) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {catSearching ? (
              <div className="flex items-center justify-center gap-2 py-12 text-xs font-semibold text-slate-500">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-[#B8860B]" />
                <span>Searching database for "{search}"...</span>
              </div>
            ) : groupedCatalog.length === 0 ? (
              <div className="py-12 text-center">
                <ChefHat size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-700">No dishes match your filter</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Try clearing the search or category filter</p>
              </div>
            ) : (
              groupedCatalog.map(([catName, groupItems]) => (
                <div key={catName} className="space-y-2">
                  <div className="flex items-center justify-between pb-0.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#B8860B]" />
                      <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        {catName}
                      </h5>
                    </div>
                    <span className="text-[11px] text-slate-400 font-semibold">{groupItems.length} dishes</span>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {groupItems.map((item) => {
                      const isAdded = selectedSet.has(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleItem(item.id)}
                          className={cn(
                            'group flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all duration-150 select-none',
                            isAdded
                              ? 'border-[#D4AF37] bg-gradient-to-r from-amber-50/90 to-amber-50/30 shadow-xs'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80',
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Dish Thumbnail */}
                            <div className="relative h-11 w-11 shrink-0 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                              {item.imageUrl ? (
                                <img
                                  src={toMediaUrl(item.imageUrl)}
                                  alt={item.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-slate-400">
                                  <Utensils size={15} />
                                </div>
                              )}
                            </div>

                            {/* Name & Subtitle with VegBadge */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <VegBadge isVeg={!item.isNonVeg} size={12} />
                                <p
                                  className={cn(
                                    'text-xs font-bold truncate leading-tight',
                                    isAdded ? 'text-amber-950 font-black' : 'text-slate-800 group-hover:text-slate-900',
                                  )}
                                >
                                  {item.name}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-400">
                                <span className="truncate">{item.leafCategory}</span>
                              </div>
                            </div>
                          </div>

                          {/* Action Pill */}
                          <div className="shrink-0 ml-2">
                            {isAdded ? (
                              <span className="flex h-6.5 w-6.5 items-center justify-center rounded-full bg-[#080C14] text-[#F3CA52] border border-[#D4AF37] shadow-xs">
                                <Check size={12} className="stroke-[3]" />
                              </span>
                            ) : (
                              <span className="flex h-6.5 w-6.5 items-center justify-center rounded-full bg-slate-100 text-slate-500 group-hover:bg-[#080C14] group-hover:text-[#F3CA52] transition-colors">
                                <Plus size={13} />
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: The Assembled Package Board (5 cols) */}
        <div
          className={cn(
            'flex flex-col bg-slate-50/70 lg:col-span-5 h-full overflow-hidden',
            mobileTab === 'catalog' ? 'hidden lg:flex' : 'flex',
          )}
        >
          {/* Header Bar */}
          <div className="border-b border-slate-200 bg-white p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Selected Dishes
                  </h4>
                  <span className="rounded-full bg-[#080C14] text-[#F3CA52] px-2 py-0.5 text-[10px] font-black">
                    {selectedItems.length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                  {sectionStats.general.selected > 0 || sectionStats.sadya.selected > 0 ? (
                    <>
                      {sectionStats.general.selected > 0 && `${sectionStats.general.selected} General`}
                      {sectionStats.general.selected > 0 && sectionStats.sadya.selected > 0 && ' • '}
                      {sectionStats.sadya.selected > 0 && `${sectionStats.sadya.selected} Sadya`}
                    </>
                  ) : (
                    'No dishes selected yet'
                  )}
                </p>
              </div>

              {selectedItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Layout switch: Course breakdown vs Sequence Reordering */}
            {selectedItems.length > 0 && (
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">View Mode</span>
                <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setBoardView('grouped')}
                    className={cn(
                      'px-2 py-0.5 rounded font-bold transition-all',
                      boardView === 'grouped'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-400 hover:text-slate-700',
                    )}
                  >
                    By Category
                  </button>
                  <button
                    type="button"
                    onClick={() => setBoardView('sequence')}
                    className={cn(
                      'px-2 py-0.5 rounded font-bold transition-all',
                      boardView === 'sequence'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-400 hover:text-slate-700',
                    )}
                  >
                    Sequence Order
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Assembled Items List */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
            {selectedItems.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-[#B8860B] mb-2.5">
                  <Utensils size={22} />
                </div>
                <h5 className="text-xs font-bold text-slate-800">Your Menu Package is Empty</h5>
                <p className="mt-1 text-[11px] text-slate-400 max-w-xs">
                  Switch between General and Sadya tabs on the left to add dishes to this package.
                </p>
              </div>
            ) : boardView === 'grouped' ? (
              // Grouped by Category View
              groupedSelected.map(([catPath, groupItems]) => (
                <div key={catPath} className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-xs space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#B8860B]">
                      {catPath}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded-full">
                      {groupItems.length}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {groupItems.map((item) => (
                      <div
                        key={item.id}
                        className="group flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 transition-colors hover:bg-amber-50/50"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ItemThumb imageUrl={item.imageUrl} name={item.name} size="sm" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{item.leafCategory}</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleItem(item.id)}
                          className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="Remove item"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              // Linear Sequence Order View (with Reordering arrows)
              <div className="space-y-1.5">
                {selectedItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-mono font-black text-slate-500">
                        {idx + 1}
                      </span>
                      <ItemThumb imageUrl={item.imageUrl} name={item.name} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{item.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{item.categoryPath}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveItem(idx, 'up')}
                        className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-20"
                        title="Move Up"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === selectedItems.length - 1}
                        onClick={() => moveItem(idx, 'down')}
                        className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-20"
                        title="Move Down"
                      >
                        <ArrowDown size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleItem(item.id)}
                        className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        title="Remove"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Footer Actions Bar */}
      <div className="border-t border-slate-200 bg-white px-5 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-700">
            {selectedItems.length} {selectedItems.length === 1 ? 'dish' : 'dishes'} selected
          </span>
          {(sectionStats.general.selected > 0 || sectionStats.sadya.selected > 0) && (
            <span className="hidden sm:inline-block text-xs text-slate-400">
              • {sectionStats.general.selected} General, {sectionStats.sadya.selected} Sadya
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-9 px-4 text-xs font-semibold rounded-xl" onClick={onCancel}>
            Cancel
          </Button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#080C14] px-5 text-xs font-bold text-[#F3CA52] border border-[#D4AF37] hover:bg-[#121927] disabled:opacity-50 shadow-sm transition-all"
          >
            {saving ? 'Saving Package…' : 'Save Package'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   MenuInspectModal — Itemized Menu Breakdown Viewer
───────────────────────────────────────────────────────────────── */
function MenuInspectModal({
  menu,
  itemMap,
  onClose,
  onEdit,
  onDuplicate,
}: {
  menu: MenuRow;
  itemMap: Map<string, CategoryItemOption>;
  onClose: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
}) {
  const isSadya = useMemo(() => {
    if (
      menu.name.toLowerCase().includes('sadya') ||
      menu.name.toLowerCase().includes('sadhya')
    ) {
      return true;
    }
    return menu.menuItems.some((mi) => itemMap.get(mi.item.id)?.topCategory === 'Sadya');
  }, [menu, itemMap]);

  // Group dishes by clean category path
  const groupedDishes = useMemo(() => {
    const map = new Map<string, Array<{ item: MenuRow['menuItems'][number]['item']; opt?: CategoryItemOption }>>();

    for (const mi of menu.menuItems) {
      const opt = itemMap.get(mi.item.id);
      const cat = opt?.categoryPath || (opt?.topCategory ? `${opt.topCategory} Dishes` : 'General Dishes');
      if (!map.has(cat)) {
        map.set(cat, []);
      }
      map.get(cat)!.push({ item: mi.item, opt });
    }

    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [menu.menuItems, itemMap]);

  return (
    <FormDialog
      title={menu.name}
      description={menu.description || 'Curated event feast package details'}
      open={true}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      contentClassName="max-w-3xl w-[95vw] max-h-[85vh] flex flex-col p-0"
      bodyClassName="p-0 flex-1 overflow-y-auto"
    >
      <div className="p-5 space-y-4">
        {/* Banner with package metadata */}
        <div
          className={cn(
            'flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 text-white border shadow-xs',
            isSadya
              ? 'bg-gradient-to-r from-[#0c1a10] to-[#122617] border-emerald-500/30'
              : 'bg-[#080C14] border-[#D4AF37]/30',
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-xl border',
                isSadya
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                  : 'bg-gradient-to-br from-[#121927] to-[#1e2a40] text-[#F3CA52] border-[#D4AF37]/40',
              )}
            >
              {isSadya ? <ChefHat size={20} /> : <Utensils size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">{menu.name}</h4>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                    isSadya
                      ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/30'
                      : 'bg-[#F3CA52]/20 text-[#F3CA52] border border-[#F3CA52]/30',
                  )}
                >
                  {isSadya ? 'Sadya Feast' : 'General'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {menu.menuItems.length} curated {menu.menuItems.length === 1 ? 'dish' : 'dishes'} in this package
              </p>
            </div>
          </div>
        </div>

        {/* Breakdown by Course / Category */}
        <div className="space-y-4">
          <h5 className="text-xs font-black uppercase tracking-wider text-slate-900">
            Course & Dish Breakdown
          </h5>

          {groupedDishes.map(([catPath, dishList]) => (
            <div key={catPath} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-[#B8860B]">
                  {catPath}
                </span>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {dishList.length} {dishList.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {dishList.map(({ item, opt }) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg bg-slate-50 p-2 border border-slate-100"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ItemThumb imageUrl={item.imageUrl || opt?.imageUrl} name={item.name} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                        {item.description && (
                          <p className="text-[10px] text-slate-400 truncate">{item.description}</p>
                        )}
                      </div>
                    </div>

                    <span className="text-[10px] text-slate-400 font-semibold shrink-0 ml-2">
                      {opt?.leafCategory || ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Actions */}
      <div className="border-t border-slate-200 bg-white px-5 py-3 flex items-center justify-between">
        <Button variant="outline" className="h-8 px-3 text-xs rounded-xl" onClick={onClose}>
          Close
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-8 px-3 text-xs rounded-xl text-slate-700 hover:text-emerald-600 flex items-center gap-1"
            onClick={onDuplicate}
          >
            <CopyPlus size={13} />
            <span>Duplicate Package</span>
          </Button>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-[#080C14] px-3.5 text-xs font-bold text-[#F3CA52] border border-[#D4AF37] hover:bg-[#121927]"
          >
            <Edit3 size={13} />
            <span>Edit Package</span>
          </button>
        </div>
      </div>
    </FormDialog>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Helpers & Catalog Normalization
───────────────────────────────────────────────────────────────── */
export function VegBadge({ isVeg, size = 13 }: { isVeg: boolean; size?: number }) {
  if (isVeg) {
    return (
      <div
        className="inline-flex shrink-0 items-center justify-center rounded-[3px] border-[1.5px] border-emerald-600 p-[1.5px] bg-white shadow-2xs"
        style={{ width: size + 2, height: size + 2 }}
        title="Pure Vegetarian"
      >
        <span
          className="rounded-full bg-emerald-600 shrink-0"
          style={{ width: size - 5, height: size - 5 }}
        />
      </div>
    );
  }
  return (
    <div
      className="inline-flex shrink-0 items-center justify-center rounded-[3px] border-[1.5px] border-rose-600 p-[1.5px] bg-white shadow-2xs"
      style={{ width: size + 2, height: size + 2 }}
      title="Non-Vegetarian"
    >
      <span
        className="rounded-full bg-rose-600 shrink-0"
        style={{ width: size - 5, height: size - 5 }}
      />
    </div>
  );
}

function toCleanTitleCase(str: string): string {
  if (!str) return '';
  if (/[a-z]/.test(str) && /[A-Z]/.test(str)) return str;
  return str
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function resolveTopCategory(path: string[], nodeName: string = ''): 'General' | 'Sadya' {
  const combined = `${path.join(' ')} ${nodeName}`.toLowerCase();
  if (combined.includes('sadya') || combined.includes('sadhya')) {
    return 'Sadya';
  }
  return 'General';
}

function flattenCategoryItems(nodes: CategoryNode[], path: string[] = []): CategoryItemOption[] {
  const result: CategoryItemOption[] = [];

  for (const node of nodes) {
    // If root node is 'Food' (case-insensitive), omit 'Food' from path so General/Sadya is top level
    const isFoodRoot = path.length === 0 && node.name.trim().toLowerCase() === 'food';
    const nextPath = isFoodRoot ? [] : [...path, node.name];

    if (node.items && node.items.length > 0) {
      // Determine topCategory and clean category breadcrumbs
      const topCat = resolveTopCategory(nextPath, node.name);

      // Clean segments: normalize GENERAL -> General, SADYA/Sadhya -> Sadya, omit Food
      const displaySegments = nextPath
        .filter((seg) => seg.trim().toLowerCase() !== 'food')
        .map((segment) => {
          const lower = segment.trim().toLowerCase();
          if (lower.includes('sadya') || lower.includes('sadhya')) return 'Sadya';
          if (lower === 'general') return 'General';
          return toCleanTitleCase(segment);
        });

      // Deduplicate adjacent identical names (e.g. ['Sadya', 'Sadya'] -> ['Sadya'])
      const uniqueSegments = displaySegments.filter((seg, idx, arr) => idx === 0 || seg !== arr[idx - 1]);
      if (uniqueSegments.length === 0) {
        uniqueSegments.push(topCat);
      }

      const categoryPath = uniqueSegments.join(' > ');
      const leafCategory = toCleanTitleCase(node.name);

      for (const item of node.items) {
        result.push({
          id: item.id,
          name: item.name,
          categoryPath,
          topCategory: topCat,
          leafCategory: leafCategory === 'Food' ? topCat : leafCategory,
          unit: item.unit,
          basePrice: item.basePrice,
          imageUrl: item.imageUrl,
          description: item.description,
          isNonVeg: isNonVegDish(item.name, `${categoryPath} ${leafCategory}`),
        });
      }
    }

    if (node.children && node.children.length > 0) {
      result.push(...flattenCategoryItems(node.children, nextPath));
    }
  }

  return result;
}

function ItemThumb({
  imageUrl,
  name,
  size = 'md',
}: {
  imageUrl?: string;
  name: string;
  size?: 'sm' | 'md';
}) {
  const cls = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9';
  const iconSize = size === 'sm' ? 12 : 14;
  if (imageUrl) {
    return (
      <img
        src={toMediaUrl(imageUrl)}
        alt={name}
        className={`${cls} rounded-lg border border-slate-200 object-cover shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${cls} flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-400`}
    >
      <ImageIcon size={iconSize} />
    </div>
  );
}
