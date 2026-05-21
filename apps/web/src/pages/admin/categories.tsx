import {
  ArrowLeft,
  FolderOpen,
  ImagePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { FormDialog, FormDialogFooter } from '@/components/common/form-dialog';
import { SectionHeader } from '@/components/common/section-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SelectInput } from '@/components/ui/select-input';
import { Textarea } from '@/components/ui/textarea';
import { categoriesService, CategoryNode } from '@/features/categories/categories.service';
import { itemsService } from '@/features/items/items.service';
import { uploadService } from '@/features/upload/upload.service';
import { useConfirmModal } from '@/hooks/use-confirm-modal';
import { PageShell } from '@/layouts/page-shell';
import { formatInr } from '@/utils/currency';
import { toMediaUrl } from '@/utils/media-url';

const UNIT_OPTIONS = ['plate', 'bowl', 'glass', 'piece', 'scoop'] as const;

type CategoryForm = {
  name: string;
  description: string;
  imageFile: File | null;
  imagePreview: string;
  parentId: string;
};

type ItemForm = {
  name: string;
  description: string;
  basePrice: string;
  unit: string;
  imageFile: File | null;
  imagePreview: string;
};

export function CategoriesPage() {
  const { confirm, confirmModal } = useConfirmModal();
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [path, setPath] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryEditId, setCategoryEditId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(initialCategoryForm());

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemEditId, setItemEditId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<ItemForm>(initialItemForm());

  const currentCategory = useMemo(() => findCategoryByPath(tree, path), [tree, path]);
  const visibleCategories = currentCategory ? currentCategory.children : tree;
  const visibleItems = currentCategory?.items ?? [];
  const breadcrumbs = buildBreadcrumbs(tree, path);
  const trimmedSearchTerm = searchTerm.trim();
  const isSearching = trimmedSearchTerm.length > 0;
  const searchResults = useMemo(() => {
    if (!isSearching) return { categories: [], items: [] };
    return searchHierarchy(tree, trimmedSearchTerm);
  }, [tree, trimmedSearchTerm, isSearching]);

  const refresh = () => void categoriesService.list().then(setTree);

  useEffect(() => {
    refresh();
  }, []);

  const handleCategorySubmit = async () => {
    try {
      let imageUrl = categoryForm.imagePreview || undefined;
      if (categoryForm.imageFile) {
        const uploaded = await uploadService.uploadOne(categoryForm.imageFile);
        imageUrl = uploaded.url;
      }

      if (categoryEditId) {
        await categoriesService.update(categoryEditId, {
          name: categoryForm.name,
          description: categoryForm.description || undefined,
          imageUrl,
        });
        toast.success('Category updated');
      } else {
        await categoriesService.create({
          name: categoryForm.name,
          description: categoryForm.description || undefined,
          parentId: categoryForm.parentId || undefined,
          imageUrl,
        });
        toast.success('Category created');
      }

      setCategoryModalOpen(false);
      setCategoryEditId(null);
      setCategoryForm(initialCategoryForm());
      refresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Unable to save category');
    }
  };

  const handleItemSubmit = async () => {
    if (!currentCategory && !itemEditId) {
      toast.error('Please open a category before adding items');
      return;
    }

    try {
      let imageUrl = itemForm.imagePreview || undefined;
      if (itemForm.imageFile) {
        const uploaded = await uploadService.uploadOne(itemForm.imageFile);
        imageUrl = uploaded.url;
      }

      if (itemEditId) {
        await itemsService.update(itemEditId, {
          name: itemForm.name,
          description: itemForm.description || undefined,
          unit: itemForm.unit || undefined,
          basePrice: Number(itemForm.basePrice || '0'),
          imageUrl,
        });
        toast.success('Item updated');
      } else {
        await itemsService.create({
          name: itemForm.name,
          description: itemForm.description || undefined,
          unit: itemForm.unit || undefined,
          basePrice: Number(itemForm.basePrice || '0'),
          categoryId: currentCategory?.id,
          imageUrl,
        });
        toast.success('Item created');
      }

      setItemModalOpen(false);
      setItemEditId(null);
      setItemForm(initialItemForm());
      refresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Unable to save item');
    }
  };

  const onDeleteCategory = async (id: string) => {
    const accepted = await confirm({
      title: 'Delete Category',
      description: 'Are you sure you want to delete this category?',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!accepted) return;

    try {
      await categoriesService.remove(id);
      toast.success('Category deleted');
      setPath((prev) => prev.filter((pid) => pid !== id));
      refresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Cannot delete this category');
    }
  };

  const onDeleteItem = async (id: string) => {
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
      toast.error(error?.response?.data?.message ?? 'Cannot delete this item');
    }
  };

  return (
    <PageShell
      title="Category Manager"
      subtitle="Manage categories, subcategories, and leaf-level items"
    >
      <Card>
        <SectionHeader
          title={currentCategory ? currentCategory.name : 'Categories'}
          subtitle={
            isSearching
              ? `${searchResults.categories.length} category matches · ${searchResults.items.length} item matches`
              : currentCategory
                ? `${visibleCategories.length} subcategories · ${visibleItems.length} items`
                : 'Top-level event categories'
          }
          actionLabel={currentCategory ? 'Add Subcategory' : 'Add Category'}
          actionIcon={<Plus size={16} className="mr-2" />}
          onAction={() => {
            setCategoryEditId(null);
            setCategoryForm({
              ...initialCategoryForm(),
              parentId: currentCategory?.id ?? '',
            });
            setCategoryModalOpen(true);
          }}
        />

        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <button
            className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-medium text-slate-700"
            onClick={() => setPath([])}
          >
            Categories
          </button>
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.id} className="flex items-center gap-2">
              <span>/</span>
              <button
                className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-medium text-slate-700"
                onClick={() => setPath(path.slice(0, index + 1))}
              >
                {crumb.name}
              </button>
            </div>
          ))}
        </div>

        <div className="mb-5">
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">Search hierarchy</label>
          <div className="relative max-w-xl">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <Input
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search category, subcategory, or item..."
            />
          </div>
          {isSearching ? (
            <p className="mt-2 text-xs text-slate-500">
              Showing exact hierarchy for each result path.
            </p>
          ) : null}
        </div>

        {currentCategory && !isSearching ? (
          <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-slate-50 p-3">
            <Button
              variant="ghost"
              className="h-9"
              onClick={() => setPath((prev) => prev.slice(0, -1))}
            >
              <ArrowLeft size={15} className="mr-2" /> Back
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setItemEditId(null);
                setItemForm(initialItemForm());
                setItemModalOpen(true);
              }}
            >
              <Plus size={15} className="mr-2" /> Add Item
            </Button>
          </div>
        ) : null}

        {isSearching ? (
          <div className="space-y-6">
            {searchResults.categories.length > 0 ? (
              <>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Matching Categories
                </h4>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {searchResults.categories.map((result) => (
                    <CategoryCard
                      key={result.node.id}
                      node={result.node}
                      hierarchyPath={result.hierarchyPath}
                      onOpen={() => setPath(result.pathIds)}
                      onEdit={() => {
                        const category = result.node;
                        setCategoryEditId(category.id);
                        setCategoryForm({
                          name: category.name,
                          description: category.description ?? '',
                          imageFile: null,
                          imagePreview: category.imageUrl ?? '',
                          parentId: category.parentId ?? '',
                        });
                        setCategoryModalOpen(true);
                      }}
                      onDelete={() => void onDeleteCategory(result.node.id)}
                    />
                  ))}
                </div>
              </>
            ) : null}

            {searchResults.items.length > 0 ? (
              <>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Matching Items
                </h4>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {searchResults.items.map((result) => (
                    <ItemCard
                      key={result.item.id}
                      item={result.item}
                      hierarchyPath={result.hierarchyPath}
                      onOpenParent={() => setPath(result.pathIds)}
                      onEdit={() => {
                        const item = result.item;
                        setItemEditId(item.id);
                        setItemForm({
                          name: item.name,
                          description: item.description ?? '',
                          unit: item.unit && UNIT_OPTIONS.includes(item.unit as any) ? item.unit : 'plate',
                          basePrice: String(item.basePrice ?? '0'),
                          imageFile: null,
                          imagePreview: item.imageUrl ?? '',
                        });
                        setItemModalOpen(true);
                      }}
                      onDelete={() => void onDeleteItem(result.item.id)}
                    />
                  ))}
                </div>
              </>
            ) : null}

            {searchResults.categories.length === 0 && searchResults.items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                <p className="text-lg font-semibold text-slate-800">No matching categories/items</p>
                <p className="mt-1 text-sm text-slate-500">
                  Try searching with another category, subcategory, or item name.
                </p>
              </div>
            ) : null}
          </div>
        ) : visibleCategories.length === 0 && visibleItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-lg font-semibold text-slate-800">No categories/items found</p>
            <p className="mt-1 text-sm text-slate-500">
              Start by adding a category, then drill down to subcategories and items.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {visibleCategories.length > 0 ? (
              <>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Subcategories
                </h4>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleCategories.map((category) => (
                    <CategoryCard
                      key={category.id}
                      node={category}
                      onOpen={() => setPath((prev) => [...prev, category.id])}
                      onEdit={() => {
                        setCategoryEditId(category.id);
                        setCategoryForm({
                          name: category.name,
                          description: category.description ?? '',
                          imageFile: null,
                          imagePreview: category.imageUrl ?? '',
                          parentId: category.parentId ?? '',
                        });
                        setCategoryModalOpen(true);
                      }}
                      onDelete={() => void onDeleteCategory(category.id)}
                    />
                  ))}
                </div>
              </>
            ) : null}

            {visibleItems.length > 0 ? (
              <>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Items
                </h4>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleItems.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onEdit={() => {
                        setItemEditId(item.id);
                        setItemForm({
                          name: item.name,
                          description: item.description ?? '',
                          unit: item.unit && UNIT_OPTIONS.includes(item.unit as any) ? item.unit : 'plate',
                          basePrice: String(item.basePrice ?? '0'),
                          imageFile: null,
                          imagePreview: item.imageUrl ?? '',
                        });
                        setItemModalOpen(true);
                      }}
                      onDelete={() => void onDeleteItem(item.id)}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </div>
        )}
      </Card>

      <FormDialog
        title={categoryEditId ? 'Edit Category' : currentCategory ? 'Add Subcategory' : 'Add Category'}
        description="Create or update category details"
        open={categoryModalOpen}
        onOpenChange={setCategoryModalOpen}
      >
        <div className="space-y-3">
          <FormField label="Category Name *">
            <Input
              value={categoryForm.name}
              onChange={(e) => setCategoryForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="Enter category name"
            />
          </FormField>

          {!categoryEditId && !currentCategory ? (
            <FormField label="Parent Category">
              <SelectInput
                value={categoryForm.parentId}
                onChange={(e) => setCategoryForm((s) => ({ ...s, parentId: e.target.value }))}
              >
                <option value="">No parent (root)</option>
                {flattenCategories(tree).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.path}
                  </option>
                ))}
              </SelectInput>
            </FormField>
          ) : null}

          <FormField label="Category Description">
            <Textarea
              value={categoryForm.description}
              onChange={(e) =>
                setCategoryForm((s) => ({ ...s, description: e.target.value }))
              }
              placeholder="Enter category description"
            />
          </FormField>

          <FormField label="Category Image">
            <UploadBox
              previewUrl={categoryForm.imagePreview}
              onFile={(file) =>
                setCategoryForm((s) => ({
                  ...s,
                  imageFile: file,
                  imagePreview: URL.createObjectURL(file),
                }))
              }
            />
          </FormField>

          <FormDialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCategoryModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCategorySubmit()}>
              {categoryEditId ? 'Save Category' : 'Create Category'}
            </Button>
          </FormDialogFooter>
        </div>
      </FormDialog>

      <FormDialog
        title={itemEditId ? 'Edit Item' : 'Add Item'}
        description={currentCategory ? `Parent: ${currentCategory.name}` : 'Add item'}
        open={itemModalOpen}
        onOpenChange={setItemModalOpen}
      >
        <div className="space-y-3">
          <FormField label="Item Name *">
            <Input
              value={itemForm.name}
              onChange={(e) => setItemForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="Enter item name"
            />
          </FormField>
          <FormField label="Item Description">
            <Textarea
              value={itemForm.description}
              onChange={(e) => setItemForm((s) => ({ ...s, description: e.target.value }))}
              placeholder="Enter item description"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Base Price">
              <Input
                type="number"
                value={itemForm.basePrice}
                onChange={(e) => setItemForm((s) => ({ ...s, basePrice: e.target.value }))}
              />
            </FormField>
            <FormField label="Unit">
              <SelectInput
                value={itemForm.unit}
                onChange={(e) => setItemForm((s) => ({ ...s, unit: e.target.value }))}
              >
                {UNIT_OPTIONS.map((u) => (
                  <option key={u} value={u}>
                    {u.charAt(0).toUpperCase() + u.slice(1)}
                  </option>
                ))}
              </SelectInput>
            </FormField>
          </div>

          <FormField label="Item Image">
            <UploadBox
              previewUrl={itemForm.imagePreview}
              onFile={(file) =>
                setItemForm((s) => ({
                  ...s,
                  imageFile: file,
                  imagePreview: URL.createObjectURL(file),
                }))
              }
            />
          </FormField>

          <FormDialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setItemModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleItemSubmit()}>
              {itemEditId ? 'Save Item' : 'Create Item'}
            </Button>
          </FormDialogFooter>
        </div>
      </FormDialog>
      {confirmModal}
    </PageShell>
  );
}

function CategoryCard({
  node,
  hierarchyPath,
  onOpen,
  onEdit,
  onDelete,
}: {
  node: CategoryNode;
  hierarchyPath?: string;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="h-40 w-full bg-slate-100">
        {node.imageUrl ? (
          <img src={toMediaUrl(node.imageUrl)} alt={node.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            <ImagePlus size={26} />
          </div>
        )}
      </div>
      <div className="space-y-2 p-4">
        {hierarchyPath ? (
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-400">
            {hierarchyPath}
          </p>
        ) : null}
        <h4 className="text-xl font-bold tracking-tight text-slate-900">{node.name}</h4>
        <p className="line-clamp-2 text-sm text-slate-500">{node.description || 'No description'}</p>
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-400">
          <span>{node.children.length} subcategories</span>
          <span>{node.items.length} items</span>
        </div>
        <div className="grid grid-cols-3 gap-2 pt-2">
          <Button onClick={onOpen} className="col-span-1">
            Open
          </Button>
          <Button variant="outline" onClick={onEdit}>
            <Pencil size={14} />
          </Button>
          <Button variant="danger" onClick={onDelete}>
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ItemCard({
  item,
  hierarchyPath,
  onOpenParent,
  onEdit,
  onDelete,
}: {
  item: CategoryNode['items'][number];
  hierarchyPath?: string;
  onOpenParent?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="h-36 w-full bg-slate-100">
        {item.imageUrl ? (
          <img src={toMediaUrl(item.imageUrl)} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            <ImagePlus size={24} />
          </div>
        )}
      </div>
      <div className="space-y-2 p-4">
        {hierarchyPath ? (
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-400">
            {hierarchyPath}
          </p>
        ) : null}
        <div className="flex items-start justify-between gap-3">
          <h4 className="text-lg font-bold text-slate-900">{item.name}</h4>
          <span className="rounded-full bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700">
            {formatInr(item.basePrice ?? 0, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </span>
        </div>
        <p className="line-clamp-2 text-sm text-slate-500">{item.description || 'No description'}</p>
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {item.unit || 'unit'}
          </span>
          <div className="flex gap-2">
            {onOpenParent ? (
              <Button variant="outline" className="h-8 px-2.5" onClick={onOpenParent}>
                <FolderOpen size={14} />
              </Button>
            ) : null}
            <Button variant="outline" className="h-8 px-2.5" onClick={onEdit}>
              <Pencil size={14} />
            </Button>
            <Button variant="danger" className="h-8 px-2.5" onClick={onDelete}>
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UploadBox({
  previewUrl,
  onFile,
}: {
  previewUrl?: string;
  onFile: (file: File) => void;
}) {
  return (
    <label className="block cursor-pointer rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
      <input
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
      />

      {previewUrl ? (
        <img src={toMediaUrl(previewUrl)} alt="preview" className="mx-auto h-24 rounded-lg object-cover" />
      ) : (
        <div className="space-y-1 text-slate-500">
          <div className="mx-auto w-fit rounded-lg bg-white p-2">
            <ImagePlus size={20} />
          </div>
          <p className="text-sm font-medium">Upload Image</p>
          <p className="text-xs">PNG, JPG, JPEG up to 5MB</p>
        </div>
      )}
    </label>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold">{label}</label>
      {children}
    </div>
  );
}

function initialCategoryForm(): CategoryForm {
  return {
    name: '',
    description: '',
    imageFile: null,
    imagePreview: '',
    parentId: '',
  };
}

function initialItemForm(): ItemForm {
  return {
    name: '',
    description: '',
    basePrice: '0',
    unit: 'plate',
    imageFile: null,
    imagePreview: '',
  };
}

function findCategoryByPath(tree: CategoryNode[], path: string[]): CategoryNode | null {
  let nodes = tree;
  let current: CategoryNode | null = null;

  for (const id of path) {
    current = nodes.find((node) => node.id === id) ?? null;
    if (!current) return null;
    nodes = current.children;
  }

  return current;
}

function buildBreadcrumbs(tree: CategoryNode[], path: string[]) {
  const crumbs: Array<{ id: string; name: string }> = [];
  let nodes = tree;

  for (const id of path) {
    const node = nodes.find((item) => item.id === id);
    if (!node) break;
    crumbs.push({ id: node.id, name: node.name });
    nodes = node.children;
  }

  return crumbs;
}

function flattenCategories(tree: CategoryNode[]) {
  const flat: Array<{ id: string; path: string }> = [];

  const walk = (nodes: CategoryNode[], parentPath = '') => {
    for (const node of nodes) {
      const path = parentPath ? `${parentPath} > ${node.name}` : node.name;
      flat.push({ id: node.id, path });
      walk(node.children, path);
    }
  };

  walk(tree);
  return flat;
}

type CategorySearchResult = {
  node: CategoryNode;
  hierarchyPath: string;
  pathIds: string[];
};

type ItemSearchResult = {
  item: CategoryNode['items'][number];
  hierarchyPath: string;
  pathIds: string[];
};

function searchHierarchy(tree: CategoryNode[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  const categories: CategorySearchResult[] = [];
  const items: ItemSearchResult[] = [];

  const walk = (nodes: CategoryNode[], pathIds: string[] = [], pathNames: string[] = []) => {
    for (const node of nodes) {
      const nextPathIds = [...pathIds, node.id];
      const nextPathNames = [...pathNames, node.name];
      const hierarchyPath = nextPathNames.join(' > ');

      if (node.name.toLowerCase().includes(normalizedQuery)) {
        categories.push({
          node,
          hierarchyPath,
          pathIds: nextPathIds,
        });
      }

      for (const item of node.items) {
        if (item.name.toLowerCase().includes(normalizedQuery)) {
          items.push({
            item,
            hierarchyPath,
            pathIds: nextPathIds,
          });
        }
      }

      walk(node.children, nextPathIds, nextPathNames);
    }
  };

  walk(tree);
  return { categories, items };
}


