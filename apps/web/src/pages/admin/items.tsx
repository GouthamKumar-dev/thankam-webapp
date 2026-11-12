import { useEffect, useMemo, useState } from 'react';
import type { MRT_ColumnDef } from 'material-react-table';
import { Edit3, Plus, Trash2 } from 'lucide-react';
import { PageShell } from '@/layouts/page-shell';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/common/data-table';
import { itemsService, ItemRow } from '@/features/items/items.service';
import { categoriesService, CategoryNode } from '@/features/categories/categories.service';
import { SectionHeader } from '@/components/common/section-header';
import { FormDialog, FormDialogFooter } from '@/components/common/form-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SelectInput } from '@/components/ui/select-input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useConfirmModal } from '@/hooks/use-confirm-modal';

type CategoryOption = { id: string; path: string };

const UNIT_OPTIONS = ['plate', 'bowl', 'glass', 'piece', 'scoop'] as const;

export function ItemsPage() {
  const { confirm, confirmModal } = useConfirmModal();
  const [rows, setRows] = useState<ItemRow[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<ItemRow | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    unit: 'plate',
    basePrice: '0',
    categoryId: '',
  });

  const refresh = () => void itemsService.list().then((res) => setRows(res.data));

  const loadCategories = () =>
    void categoriesService.list().then((tree) => {
      const flat: CategoryOption[] = [];
      const walk = (nodes: CategoryNode[], parentPath = '') => {
        for (const node of nodes) {
          const path = parentPath ? `${parentPath} > ${node.name}` : node.name;
          flat.push({ id: node.id, path });
          walk(node.children, path);
        }
      };
      walk(tree);
      setCategories(flat);
    });

  useEffect(() => {
    refresh();
    loadCategories();
  }, []);

  const columns = useMemo<MRT_ColumnDef<ItemRow>[]>(
    () => [
      { accessorKey: 'name', header: 'Item' },
      { accessorFn: (r) => r.category.name, header: 'Category' },
      {
        id: 'actions',
        header: 'Actions',
        Cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="h-8 px-2.5"
                onClick={() => {
                  setSelected(item);
                  setForm({
                    name: item.name,
                    description: item.description ?? '',
                    unit: item.unit && UNIT_OPTIONS.includes(item.unit as any) ? item.unit : 'plate',
                    basePrice: String(item.basePrice),
                    categoryId: item.category.id,
                  });
                  setEditOpen(true);
                }}
              >
                <Edit3 size={14} />
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
      await itemsService.create({
        name: form.name,
        description: form.description || undefined,
        unit: form.unit || undefined,
        basePrice: Number(form.basePrice),
        categoryId: form.categoryId,
      });
      toast.success('Item created');
      setCreateOpen(false);
      setForm({ name: '', description: '', unit: 'plate', basePrice: '0', categoryId: '' });
      refresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Failed to create item');
    }
  };

  const onUpdate = async () => {
    if (!selected) return;

    try {
      await itemsService.update(selected.id, {
        name: form.name,
        description: form.description || undefined,
        unit: form.unit || undefined,
        basePrice: Number(form.basePrice),
      });
      toast.success('Item updated');
      setEditOpen(false);
      refresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Failed to update item');
    }
  };

  const onDelete = async (id: string) => {
    const accepted = await confirm({
      title: 'Delete Item',
      description: 'Are you sure you want to delete this item?',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!accepted) return;

    try {
      await itemsService.remove(id);
      toast.success('Item deleted');
      refresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Failed to delete item');
    }
  };

  return (
    <PageShell title="Items" subtitle="Leaf-node items used in menus and quotations">
      <Card>
        <SectionHeader
          title="Item Manager"
          subtitle="Create and maintain pricing-ready event items"
          actionLabel="Add Item"
          actionIcon={<Plus size={16} className="mr-2" />}
          onAction={() => {
            setForm({ name: '', description: '', unit: 'plate', basePrice: '0', categoryId: '' });
            setCreateOpen(true);
          }}
        />
        <DataTable columns={columns} data={rows} />
      </Card>

      <FormDialog
        title="Create Item"
        description="Add an item under a leaf category"
        open={createOpen}
        onOpenChange={setCreateOpen}
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-semibold">Item Name</label>
            <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Category</label>
            <SelectInput
              value={form.categoryId}
              onChange={(e) => setForm((s) => ({ ...s, categoryId: e.target.value }))}
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.path}
                </option>
              ))}
            </SelectInput>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Description</label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
            />
          </div>

          <FormDialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void onCreate()}>Create</Button>
          </FormDialogFooter>
        </div>
      </FormDialog>

      <FormDialog
        title="Edit Item"
        description="Update item details"
        open={editOpen}
        onOpenChange={setEditOpen}
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-semibold">Item Name</label>
            <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Description</label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
            />
          </div>

          <FormDialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void onUpdate()}>Save Changes</Button>
          </FormDialogFooter>
        </div>
      </FormDialog>
      {confirmModal}
    </PageShell>
  );
}
