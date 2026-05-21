import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import type { MRT_ColumnDef } from 'material-react-table';
import { CopyPlus, Edit3, ImageIcon, Plus, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable } from '@/components/common/data-table';
import { FormDialog, FormDialogFooter } from '@/components/common/form-dialog';
import { SectionHeader } from '@/components/common/section-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { categoriesService, CategoryNode } from '@/features/categories/categories.service';
import { menusService, MenuRow } from '@/features/menus/menus.service';
import { useConfirmModal } from '@/hooks/use-confirm-modal';
import { PageShell } from '@/layouts/page-shell';
import { formatInr } from '@/utils/currency';
import { toMediaUrl } from '@/utils/media-url';

type MenuFormState = {
  name: string;
  description: string;
  itemIds: string[];
};

type CategoryItemOption = {
  id: string;
  name: string;
  categoryPath: string;
  topCategory: string;
  unit?: string;
  basePrice?: string;
  imageUrl?: string;
};

export function MenusPage() {
  const { confirm, confirmModal } = useConfirmModal();
  const [rows, setRows] = useState<MenuRow[]>([]);
  const [itemOptions, setItemOptions] = useState<CategoryItemOption[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<MenuRow | null>(null);
  const [form, setForm] = useState<MenuFormState>({ name: '', description: '', itemIds: [] });

  const refresh = () => void menusService.list().then(setRows);
  const loadItemOptions = () =>
    void categoriesService.list().then((tree) => setItemOptions(flattenCategoryItems(tree)));

  useEffect(() => { refresh(); loadItemOptions(); }, []);

  const columns = useMemo<MRT_ColumnDef<MenuRow>[]>(
    () => [
      { accessorKey: 'name', header: 'Menu' },
      { accessorKey: 'description', header: 'Description' },
      { accessorFn: (r) => r.menuItems.length, header: 'Items Count' },
      {
        id: 'actions',
        header: 'Actions',
        Cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex gap-2">
              <Button variant="outline" className="h-8 px-2.5"
                onClick={() => {
                  setSelected(item);
                  setForm({ name: item.name, description: item.description ?? '', itemIds: item.menuItems.map((mi) => mi.item.id) });
                  setEditOpen(true);
                }}>
                <Edit3 size={14} />
              </Button>
              <Button variant="outline" className="h-8 px-2.5" onClick={() => void onDuplicate(item.id)}>
                <CopyPlus size={14} />
              </Button>
              <Button variant="danger" className="h-8 px-2.5" onClick={() => void onDelete(item.id)}>
                <Trash2 size={14} />
              </Button>
            </div>
          );
        },
      },
    ],
    [],
  );

  const onCreate = async () => {
    try {
      await menusService.create({ name: form.name, description: form.description || undefined, itemIds: form.itemIds });
      toast.success('Menu created');
      setCreateOpen(false);
      setForm({ name: '', description: '', itemIds: [] });
      refresh();
    } catch (error: any) { toast.error(error?.response?.data?.message ?? 'Failed to create menu'); }
  };

  const onUpdate = async () => {
    if (!selected) return;
    try {
      await menusService.update(selected.id, { name: form.name, description: form.description || undefined, itemIds: form.itemIds });
      toast.success('Menu updated');
      setEditOpen(false);
      refresh();
    } catch (error: any) { toast.error(error?.response?.data?.message ?? 'Failed to update menu'); }
  };

  const onDuplicate = async (id: string) => {
    try { await menusService.duplicate(id); toast.success('Menu duplicated'); refresh(); }
    catch { toast.error('Failed to duplicate menu'); }
  };

  const onDelete = async (id: string) => {
    const accepted = await confirm({ title: 'Delete Menu', description: 'Are you sure you want to delete this menu?', confirmLabel: 'Delete', destructive: true });
    if (!accepted) return;
    try { await menusService.remove(id); toast.success('Menu deleted'); refresh(); }
    catch (error: any) { toast.error(error?.response?.data?.message ?? 'Failed to delete menu'); }
  };

  return (
    <PageShell title="Menus" subtitle="Build category-based item bundles for quotations">
      <Card>
        <SectionHeader
          title="Menu Builder"
          subtitle="Create curated menus from category/subcategory leaf items"
          actionLabel="Add Menu"
          actionIcon={<Plus size={16} className="mr-2" />}
          onAction={() => { setForm({ name: '', description: '', itemIds: [] }); setCreateOpen(true); }}
        />
        <DataTable columns={columns} data={rows} />
      </Card>

      <FormDialog title="Create Menu" description="Compose a new menu from categorized items" open={createOpen} onOpenChange={setCreateOpen} contentClassName="max-w-5xl">
        <MenuForm form={form} setForm={setForm} items={itemOptions} onSubmit={onCreate} onCancel={() => setCreateOpen(false)} />
      </FormDialog>

      <FormDialog title="Edit Menu" description="Update menu details and included items" open={editOpen} onOpenChange={setEditOpen} contentClassName="max-w-5xl">
        <MenuForm form={form} setForm={setForm} items={itemOptions} onSubmit={onUpdate} onCancel={() => setEditOpen(false)} />
      </FormDialog>
      {confirmModal}
    </PageShell>
  );
}

/* ─────────────────────────────────────────────────────────────────
   MenuForm — quotation-style catalog browser
───────────────────────────────────────────────────────────────── */
function MenuForm({
  form, setForm, items, onSubmit, onCancel,
}: {
  form: MenuFormState;
  setForm: Dispatch<SetStateAction<MenuFormState>>;
  items: CategoryItemOption[];
  onSubmit: () => Promise<void>;
  onCancel: () => void;
}) {
  const [search, setSearch]       = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [saving, setSaving]       = useState(false);

  /* Unique top-level categories for the filter dropdown */
  const topCategories = useMemo(() =>
    Array.from(new Set(items.map(i => i.topCategory))).sort()
  , [items]);

  /* Items visible in the browser (filtered by search + category) */
  const visibleItems = useMemo(() => {
    const needle = search.toLowerCase();
    return items.filter(item =>
      (!catFilter || item.topCategory === catFilter) &&
      (!needle || item.name.toLowerCase().includes(needle) || item.categoryPath.toLowerCase().includes(needle))
    );
  }, [items, search, catFilter]);

  /* Group visible items by their full categoryPath */
  const grouped = useMemo(() => {
    const map = new Map<string, CategoryItemOption[]>();
    for (const item of visibleItems) {
      if (!map.has(item.categoryPath)) map.set(item.categoryPath, []);
      map.get(item.categoryPath)!.push(item);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [visibleItems]);

  const selectedSet   = useMemo(() => new Set(form.itemIds), [form.itemIds]);
  const selectedItems = useMemo(() => items.filter(i => selectedSet.has(i.id)), [items, selectedSet]);

  const toggleItem = (id: string) => {
    setForm(prev => ({
      ...prev,
      itemIds: prev.itemIds.includes(id) ? prev.itemIds.filter(x => x !== id) : [...prev.itemIds, id],
    }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('Menu name is required'); return; }
    setSaving(true);
    try { await onSubmit(); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      {/* ── Name + Description row ── */}
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Menu Name</label>
          <Input value={form.name} onChange={e => setForm(s => ({ ...s, name: e.target.value }))}
            placeholder="e.g. Wedding Deluxe" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Description <span className="font-normal text-slate-400">(optional)</span></label>
          <Input value={form.description} onChange={e => setForm(s => ({ ...s, description: e.target.value }))}
            placeholder="Brief description of this menu" />
        </div>
      </div>

      {/* ── Catalog browser + selected panel ── */}
      <div className="grid gap-3 lg:grid-cols-[1fr_280px]">

        {/* Left: catalog browser */}
        <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-50">
          {/* Search + category filter */}
          <div className="flex items-center gap-2 border-b border-slate-200 p-2.5">
            <div className="relative flex-1">
              <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search catalog…"
                className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-sm outline-none focus:border-[#0F1B3C]" />
            </div>
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none focus:border-[#0F1B3C]">
              <option value="">All Categories</option>
              {topCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Item list */}
          <div className="max-h-[420px] overflow-y-auto p-2">
            {grouped.length === 0
              ? <p className="py-6 text-center text-xs text-slate-400">No items match</p>
              : <div className="space-y-3">
                  {grouped.map(([path, groupItems]) => (
                    <div key={path}>
                      {/* Category label */}
                      <p className="px-2 pb-1 pt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {path}
                      </p>
                      <div className="space-y-0.5">
                        {groupItems.map(item => {
                          const added = selectedSet.has(item.id);
                          return (
                            <button key={item.id} type="button" onClick={() => toggleItem(item.id)}
                              className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${added ? 'bg-[#FDF3D0]' : 'hover:bg-white'}`}>
                              <div className="flex min-w-0 items-center gap-2">
                                <ItemThumb imageUrl={item.imageUrl} name={item.name} size="sm" />
                                <div className="min-w-0">
                                  <span className={`font-medium ${added ? 'text-[#B8860B]' : 'text-slate-800'}`}>{item.name}</span>
                                  {item.basePrice && Number(item.basePrice) > 0 && (
                                    <span className="ml-1.5 text-[10px] text-slate-400">
                                      {formatInr(item.basePrice, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                                added ? 'bg-[#B8860B] text-white' : 'bg-slate-200 text-slate-600 hover:bg-[#0F1B3C] hover:text-white'
                              }`}>
                                {added ? '✓' : '+'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
        </div>

        {/* Right: selected items */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Selected Items</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${selectedItems.length > 0 ? 'bg-[#0F1B3C] text-white' : 'bg-slate-100 text-slate-400'}`}>
              {selectedItems.length}
            </span>
          </div>
          <div className="max-h-[420px] flex-1 overflow-y-auto p-2">
            {selectedItems.length === 0
              ? <div className="flex h-28 items-center justify-center">
                  <p className="text-xs text-slate-400">Select items from the catalog</p>
                </div>
              : <div className="space-y-1">
                  {selectedItems.map(item => (
                    <div key={item.id} className="group flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 hover:bg-[#FDF3D0]/60">
                      <div className="flex min-w-0 items-center gap-2">
                        <ItemThumb imageUrl={item.imageUrl} name={item.name} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800">{item.name}</p>
                          <p className="truncate text-[10px] text-slate-400">{item.categoryPath.split(' > ').pop()}</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => toggleItem(item.id)}
                        className="ml-2 grid h-6 w-6 shrink-0 place-items-center rounded-lg text-slate-300 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
            }
          </div>
        </div>
      </div>

      <FormDialogFooter className="flex items-center justify-between">
        <p className="text-xs text-slate-400">
          {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} in this menu
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? 'Saving…' : 'Save Menu'}
          </Button>
        </div>
      </FormDialogFooter>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────── */
function flattenCategoryItems(nodes: CategoryNode[], path: string[] = []): CategoryItemOption[] {
  const result: CategoryItemOption[] = [];
  for (const node of nodes) {
    const currentPath = [...path, node.name];
    for (const item of node.items) {
      result.push({
        id: item.id, name: item.name,
        categoryPath: currentPath.join(' > '),
        topCategory: currentPath[0],
        unit: item.unit, basePrice: item.basePrice, imageUrl: item.imageUrl,
      });
    }
    result.push(...flattenCategoryItems(node.children, currentPath));
  }
  return result;
}

function ItemThumb({ imageUrl, name, size = 'md' }: { imageUrl?: string; name: string; size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9';
  const iconSize = size === 'sm' ? 12 : 14;
  if (imageUrl) {
    return <img src={toMediaUrl(imageUrl)} alt={name} className={`${cls} rounded-md border border-slate-200 object-cover shrink-0`} />;
  }
  return (
    <div className={`${cls} flex shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-400`}>
      <ImageIcon size={iconSize} />
    </div>
  );
}
