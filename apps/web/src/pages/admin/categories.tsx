import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  FolderPlus,
  ImagePlus,
  Layers,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UtensilsCrossed,
  X,
  ExternalLink,
  Check,
} from 'lucide-react';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { FormDialog, FormDialogFooter } from '@/components/common/form-dialog';
import { Button } from '@/components/ui/button';
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

const UNIT_OPTIONS = [
  'plate',
  'bowl',
  'glass',
  'piece',
  'scoop',
  'kg',
  'guest',
  'cup',
  'portion',
] as const;

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
  const [loading, setLoading] = useState(true);

  // Active path of category IDs (breadcrumbs)
  const [path, setPath] = useState<string[]>([]);

  // Expanded nodes in tree explorer
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Global search and in-category dish search
  const [globalSearch, setGlobalSearch] = useState('');
  const [dishSearch, setDishSearch] = useState('');

  // Tree filter search (in left panel)
  const [treeSearch, setTreeSearch] = useState('');

  // Category Modal
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryEditId, setCategoryEditId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(initialCategoryForm());
  const [savingCategory, setSavingCategory] = useState(false);

  // Item Modal
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemEditId, setItemEditId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<ItemForm>(initialItemForm());
  const [savingItem, setSavingItem] = useState(false);

  // Active category node
  const currentCategory = useMemo(() => findCategoryByPath(tree, path), [tree, path]);

  // Overall catalog stats
  const catalogStats = useMemo(() => countCatalogStats(tree), [tree]);

  // Breadcrumbs
  const breadcrumbs = useMemo(() => buildBreadcrumbs(tree, path), [tree, path]);

  // Global search results
  const trimmedGlobalSearch = globalSearch.trim();
  const isGlobalSearching = trimmedGlobalSearch.length > 0;
  const searchResults = useMemo(() => {
    if (!isGlobalSearching) return { categories: [], items: [] };
    return searchHierarchy(tree, trimmedGlobalSearch);
  }, [tree, trimmedGlobalSearch, isGlobalSearching]);

  // Filtered dishes in active category
  const activeDishes = useMemo(() => {
    if (!currentCategory) return [];
    const items = currentCategory.items ?? [];
    const q = dishSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)),
    );
  }, [currentCategory, dishSearch]);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await categoriesService.list();
      setTree(data);
      // Auto expand top level nodes initially if none expanded
      setExpandedNodes((prev) => {
        if (prev.size > 0) return prev;
        return new Set(data.map((n) => n.id));
      });
    } catch (err: any) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  // Toggle tree node expansion
  const toggleExpand = (nodeId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const walk = (nodes: CategoryNode[]) => {
      for (const n of nodes) {
        allIds.add(n.id);
        if (n.children?.length) walk(n.children);
      }
    };
    walk(tree);
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  // Select category in tree
  const selectCategory = (category: CategoryNode, parentPathIds: string[] = []) => {
    const fullPath = [...parentPathIds, category.id];
    setPath(fullPath);
    setGlobalSearch('');
    setDishSearch('');
    // Auto expand ancestors
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      fullPath.forEach((id) => next.add(id));
      return next;
    });
  };

  // Open Category Create Dialog
  const onOpenAddCategory = (parentId = '') => {
    setCategoryEditId(null);
    setCategoryForm({
      ...initialCategoryForm(),
      parentId: parentId || (currentCategory?.id ?? ''),
    });
    setCategoryModalOpen(true);
  };

  // Open Category Edit Dialog
  const onOpenEditCategory = (cat: CategoryNode, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCategoryEditId(cat.id);
    setCategoryForm({
      name: cat.name,
      description: cat.description ?? '',
      imageFile: null,
      imagePreview: cat.imageUrl ?? '',
      parentId: cat.parentId ?? '',
    });
    setCategoryModalOpen(true);
  };

  // Submit Category
  const handleCategorySubmit = async () => {
    if (!categoryForm.name.trim()) {
      toast.error('Please enter a category name');
      return;
    }
    setSavingCategory(true);
    try {
      let imageUrl = categoryForm.imagePreview || undefined;
      if (categoryForm.imageFile) {
        const uploaded = await uploadService.uploadOne(categoryForm.imageFile);
        imageUrl = uploaded.url;
      }

      if (categoryEditId) {
        await categoriesService.update(categoryEditId, {
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim() || undefined,
          imageUrl,
        });
        toast.success('Category updated successfully');
      } else {
        await categoriesService.create({
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim() || undefined,
          parentId: categoryForm.parentId || undefined,
          imageUrl,
        });
        toast.success('Category created successfully');
        if (categoryForm.parentId) {
          setExpandedNodes((prev) => new Set([...prev, categoryForm.parentId]));
        }
      }

      setCategoryModalOpen(false);
      setCategoryEditId(null);
      setCategoryForm(initialCategoryForm());
      await refresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? error?.message ?? 'Unable to save category');
    } finally {
      setSavingCategory(false);
    }
  };

  // Delete Category
  const onDeleteCategory = async (id: string, name: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const accepted = await confirm({
      title: 'Delete Category',
      description: `Are you sure you want to delete "${name}"? Any subcategories or items inside may be affected.`,
      confirmLabel: 'Delete Category',
      destructive: true,
    });
    if (!accepted) return;

    try {
      await categoriesService.remove(id);
      toast.success(`Category "${name}" deleted`);
      setPath((prev) => prev.filter((pid) => pid !== id));
      await refresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Cannot delete this category');
    }
  };

  // Open Dish / Item Create Dialog
  const onOpenAddItem = () => {
    if (!currentCategory) {
      toast.error('Please select a category first to add dishes');
      return;
    }
    setItemEditId(null);
    setItemForm(initialItemForm());
    setItemModalOpen(true);
  };

  // Open Dish / Item Edit Dialog
  const onOpenEditItem = (item: CategoryNode['items'][number]) => {
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
  };

  // Submit Dish / Item
  const handleItemSubmit = async () => {
    if (!itemForm.name.trim()) {
      toast.error('Please enter a dish / item name');
      return;
    }
    if (!currentCategory && !itemEditId) {
      toast.error('Please select a category before adding items');
      return;
    }
    setSavingItem(true);
    try {
      let imageUrl = itemForm.imagePreview || undefined;
      if (itemForm.imageFile) {
        const uploaded = await uploadService.uploadOne(itemForm.imageFile);
        imageUrl = uploaded.url;
      }

      if (itemEditId) {
        await itemsService.update(itemEditId, {
          name: itemForm.name.trim(),
          description: itemForm.description.trim() || undefined,
          unit: itemForm.unit || undefined,
          basePrice: Number(itemForm.basePrice || '0'),
          imageUrl,
        });
        toast.success('Dish updated');
      } else {
        await itemsService.create({
          name: itemForm.name.trim(),
          description: itemForm.description.trim() || undefined,
          unit: itemForm.unit || undefined,
          basePrice: Number(itemForm.basePrice || '0'),
          categoryId: currentCategory?.id,
          imageUrl,
        });
        toast.success('Dish created');
      }

      setItemModalOpen(false);
      setItemEditId(null);
      setItemForm(initialItemForm());
      await refresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? error?.message ?? 'Unable to save dish');
    } finally {
      setSavingItem(false);
    }
  };

  // Delete Dish / Item
  const onDeleteItem = async (id: string, name: string) => {
    const accepted = await confirm({
      title: 'Delete Dish',
      description: `Are you sure you want to delete "${name}" from this category?`,
      confirmLabel: 'Delete Dish',
      destructive: true,
    });
    if (!accepted) return;

    try {
      await itemsService.remove(id);
      toast.success(`Dish "${name}" deleted`);
      await refresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Cannot delete this dish');
    }
  };

  return (
    <PageShell
      title="Category Manager"
      subtitle="Organize your catering catalog, menu courses, and dishes"
    >
      <div className="space-y-4">
        {/* ── Top Bar: Quick Stats & Global Search Bar ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
          {/* Quick Metrics */}
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200/80 px-3 py-1.5 text-xs font-bold text-slate-800">
              <Layers size={14} className="text-[#B8860B]" />
              <span>{catalogStats.totalCategories} Categories</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200/80 px-3 py-1.5 text-xs font-bold text-slate-800">
              <UtensilsCrossed size={14} className="text-[#B8860B]" />
              <span>{catalogStats.totalItems} Total Dishes</span>
            </div>
          </div>

          {/* Right Action: Global Search & Add Root */}
          <div className="flex items-center gap-2.5 flex-1 max-w-md justify-end">
            <div className="relative flex-1">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search across all categories & dishes…"
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-8 text-xs font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#B8860B] focus:bg-white focus:ring-2 focus:ring-[#B8860B]/15"
              />
              {globalSearch && (
                <button
                  type="button"
                  onClick={() => setGlobalSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={refresh}
              disabled={loading}
              className="h-9 w-9 p-0 rounded-xl"
              title="Refresh tree"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </Button>

            <button
              type="button"
              onClick={() => onOpenAddCategory('')}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#080C14] px-3.5 text-xs font-bold text-[#F3CA52] border border-[#D4AF37]/50 shadow-xs hover:bg-[#101622] transition-all shrink-0"
            >
              <Plus size={14} className="text-[#F3CA52]" />
              <span className="hidden sm:inline">Root Category</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        {/* ── Global Search Results View (If Search Active) ── */}
        {isGlobalSearching ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Search Results for &ldquo;{trimmedGlobalSearch}&rdquo;
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Found {searchResults.categories.length} categories and {searchResults.items.length} dishes
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setGlobalSearch('')}
                className="h-8 rounded-xl text-xs"
              >
                Clear Search
              </Button>
            </div>

            {/* Matching Categories */}
            {searchResults.categories.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#B8860B]">
                  Matching Categories ({searchResults.categories.length})
                </h4>
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {searchResults.categories.map((res) => (
                    <div
                      key={res.node.id}
                      onClick={() => selectCategory(res.node, res.pathIds.slice(0, -1))}
                      className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 hover:border-[#D4AF37] hover:bg-white hover:shadow-xs transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#080C14] text-[#F3CA52] border border-[#D4AF37]/40">
                          <Folder size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate group-hover:text-[#B8860B]">
                            {res.node.name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {res.hierarchyPath}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full shrink-0">
                        {res.node.items.length} dishes
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Matching Dishes */}
            {searchResults.items.length > 0 && (
              <div className="space-y-2 pt-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#B8860B]">
                  Matching Dishes ({searchResults.items.length})
                </h4>
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {searchResults.items.map((res) => (
                    <div
                      key={res.item.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 hover:border-[#D4AF37] hover:shadow-xs transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                          {res.item.imageUrl ? (
                            <img
                              src={toMediaUrl(res.item.imageUrl)}
                              alt={res.item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-300">
                              <UtensilsCrossed size={16} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {res.item.name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {res.hierarchyPath}
                          </p>
                          {Number(res.item.basePrice) > 0 && (
                            <p className="text-[11px] font-mono font-bold text-[#B8860B]">
                              {formatInr(Number(res.item.basePrice))}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            setPath(res.pathIds);
                            setGlobalSearch('');
                          }}
                          title="View category"
                        >
                          <ExternalLink size={12} />
                        </Button>
                        <Button
                          variant="outline"
                          className="h-7 w-7 p-0"
                          onClick={() => onOpenEditItem(res.item)}
                          title="Edit item"
                        >
                          <Pencil size={12} />
                        </Button>
                        <Button
                          variant="danger"
                          className="h-7 w-7 p-0"
                          onClick={() => void onDeleteItem(res.item.id, res.item.name)}
                          title="Delete item"
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchResults.categories.length === 0 && searchResults.items.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">
                No categories or dishes found matching &ldquo;{trimmedGlobalSearch}&rdquo;.
              </div>
            )}
          </div>
        ) : (
          /* ════════════════════════════════════════════════════════════════
             MAIN SPLIT LAYOUT: LEFT TREE EXPLORER + RIGHT CATEGORY WORKSPACE
             ════════════════════════════════════════════════════════════════ */
          <div className="grid gap-4 lg:grid-cols-[340px_1fr] items-start">
            {/* ── LEFT PANEL: HIERARCHY TREE EXPLORER ── */}
            <div className={`space-y-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs ${currentCategory ? 'hidden lg:block' : 'block'}`}>
              {/* Tree Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="grid h-6 w-6 place-items-center rounded-lg bg-[#080C14] text-[#F3CA52] border border-[#D4AF37]/40 shadow-xs">
                    <Layers size={12} />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Category Hierarchy
                  </h3>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                  <button
                    type="button"
                    onClick={expandAll}
                    className="hover:text-slate-900 transition-colors px-1"
                    title="Expand all branches"
                  >
                    Expand
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={collapseAll}
                    className="hover:text-slate-900 transition-colors px-1"
                    title="Collapse all branches"
                  >
                    Collapse
                  </button>
                </div>
              </div>

              {/* Tree Search Input */}
              <div className="relative">
                <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={treeSearch}
                  onChange={(e) => setTreeSearch(e.target.value)}
                  placeholder="Filter category tree…"
                  className="h-8 w-full rounded-xl border border-slate-200 bg-slate-50 pl-7 pr-7 text-xs font-medium text-slate-700 outline-none placeholder:text-slate-400 focus:border-[#B8860B] focus:bg-white"
                />
                {treeSearch && (
                  <button
                    type="button"
                    onClick={() => setTreeSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Tree Node List */}
              <div className="max-h-[calc(100vh-280px)] overflow-y-auto space-y-1 pr-1" style={{ scrollbarWidth: 'thin' }}>
                {tree.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No categories created yet. Click below to add your first root category.
                  </div>
                ) : (
                  tree.map((node) => (
                    <TreeNode
                      key={node.id}
                      node={node}
                      depth={0}
                      parentPathIds={[]}
                      activeId={currentCategory?.id}
                      expandedNodes={expandedNodes}
                      filterQuery={treeSearch.trim().toLowerCase()}
                      onToggleExpand={toggleExpand}
                      onSelect={selectCategory}
                      onAddSubcategory={onOpenAddCategory}
                      onEdit={onOpenEditCategory}
                      onDelete={onDeleteCategory}
                    />
                  ))
                )}
              </div>

              {/* Add Root Button */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onOpenAddCategory('')}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-2.5 text-xs font-bold text-slate-700 hover:border-[#B8860B] hover:text-[#B8860B] hover:bg-amber-50/30 transition-all"
                >
                  <Plus size={14} />
                  <span>Add New Root Category</span>
                </button>
              </div>
            </div>

            {/* ── RIGHT PANEL: FOCUSED CATEGORY WORKSPACE ── */}
            <div className={`space-y-4 ${!currentCategory ? 'hidden lg:block' : 'block'}`}>
              {!currentCategory ? (
                /* No Category Selected (Overview Dashboard) */
                <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#B8860B]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#B8860B]">
                          Catalog Overview
                        </span>
                      </div>
                      <h2 className="mt-1 text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        Catering &amp; Menu Catalog
                      </h2>
                      <p className="mt-0.5 text-xs text-slate-500 leading-relaxed max-w-lg">
                        Select a category from the hierarchy on the left to manage its subcategories, add or edit dishes, and adjust pricing.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenAddCategory('')}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#080C14] px-5 py-2.5 text-xs font-bold text-[#F3CA52] border border-[#D4AF37] hover:bg-[#101622] transition-all shadow-xs self-start sm:self-auto"
                    >
                      <Plus size={14} className="text-[#F3CA52]" />
                      <span>Create Root Category</span>
                    </button>
                  </div>

                  {/* Top-Level Category Grid */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                      Top-Level Root Categories ({tree.length})
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {tree.map((cat) => {
                        const descendantCount = countBranchItems(cat);
                        return (
                          <div
                            key={cat.id}
                            onClick={() => selectCategory(cat)}
                            className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:border-[#D4AF37] hover:shadow-md transition-all cursor-pointer"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-2xs">
                                {cat.imageUrl ? (
                                  <img
                                    src={toMediaUrl(cat.imageUrl)}
                                    alt={cat.name}
                                    className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                ) : (
                                  <div className="grid h-full w-full place-items-center bg-[#080C14] text-[#F3CA52]">
                                    <Folder size={18} />
                                  </div>
                                )}
                              </div>

                              <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                                {descendantCount} dishes
                              </span>
                            </div>

                            <div className="mt-3">
                              <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#B8860B] transition-colors truncate">
                                {cat.name}
                              </h4>
                              <p className="mt-0.5 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                {cat.description || 'No description added.'}
                              </p>
                            </div>

                            <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-400 font-semibold">
                              <span>{cat.children?.length ?? 0} Subcategories</span>
                              <span className="text-[#B8860B] group-hover:translate-x-0.5 transition-transform">
                                Explore &rarr;
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* Selected Category Active Workspace */
                <div className="space-y-4 animate-fade-in">
                  {/* 1. Breadcrumbs & Mobile Return Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-2xs">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      {/* Mobile Back Button */}
                      <button
                        type="button"
                        onClick={() => setPath([])}
                        className="lg:hidden inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-white mr-1"
                      >
                        <ArrowLeft size={13} />
                        <span>Tree</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPath([])}
                        className="rounded-lg px-2 py-1 font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                      >
                        All Categories
                      </button>

                      {breadcrumbs.map((crumb, idx) => (
                        <div key={crumb.id} className="flex items-center gap-1.5">
                          <span className="text-slate-300">/</span>
                          <button
                            type="button"
                            onClick={() => setPath(path.slice(0, idx + 1))}
                            className={`rounded-lg px-2 py-1 font-bold transition-colors ${
                              idx === breadcrumbs.length - 1
                                ? 'bg-[#080C14] text-[#F3CA52] shadow-2xs'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                          >
                            {crumb.name}
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Quick Parent Level Jump */}
                    {path.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setPath((p) => p.slice(0, -1))}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 transition-colors"
                      >
                        <ArrowLeft size={12} />
                        <span>Up One Level</span>
                      </button>
                    )}
                  </div>

                  {/* 2. Hero Category Card */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex items-start gap-4 min-w-0">
                        {/* Image Preview / Placeholder */}
                        <div className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
                          {currentCategory.imageUrl ? (
                            <img
                              src={toMediaUrl(currentCategory.imageUrl)}
                              alt={currentCategory.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="grid h-full w-full place-items-center bg-[#080C14] text-[#F3CA52]">
                              <FolderOpen size={24} />
                            </div>
                          )}
                        </div>

                        {/* Category Info */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-amber-50 text-[#B8860B] border border-[#D4AF37]/40 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                              {path.length === 1 ? 'Root Category' : 'Subcategory'}
                            </span>
                          </div>
                          <h2 className="mt-1 text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">
                            {currentCategory.name}
                          </h2>
                          <p className="mt-1 text-xs text-slate-500 leading-relaxed max-w-xl">
                            {currentCategory.description || 'No description provided.'}
                          </p>

                          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400 font-medium">
                            <span>{currentCategory.children?.length ?? 0} Subcategories</span>
                            <span>•</span>
                            <span>{currentCategory.items?.length ?? 0} Direct Dishes</span>
                            <span>•</span>
                            <span className="font-bold text-slate-700">
                              {countBranchItems(currentCategory)} Total Branch Dishes
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Header Actions */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onOpenAddCategory(currentCategory.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-[#D4AF37] hover:text-[#B8860B] transition-all shadow-2xs"
                        >
                          <FolderPlus size={14} />
                          <span>+ Subcategory</span>
                        </button>
                        <button
                          type="button"
                          onClick={onOpenAddItem}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#080C14] px-3.5 py-2 text-xs font-bold text-[#F3CA52] border border-[#D4AF37] hover:bg-[#101622] transition-all shadow-xs"
                        >
                          <Plus size={14} className="text-[#F3CA52]" />
                          <span>+ Add Dish</span>
                        </button>
                        <Button
                          variant="outline"
                          onClick={(e) => onOpenEditCategory(currentCategory, e)}
                          className="h-8 rounded-xl px-2.5"
                          title="Edit Category Details"
                        >
                          <Pencil size={13} />
                        </Button>
                        <Button
                          variant="danger"
                          onClick={(e) => onDeleteCategory(currentCategory.id, currentCategory.name, e)}
                          className="h-8 rounded-xl px-2.5"
                          title="Delete Category"
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* 3. Subcategories Section (if any children exist) */}
                  {currentCategory.children && currentCategory.children.length > 0 && (
                    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <Folder size={14} className="text-[#B8860B]" />
                          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                            Subcategories ({currentCategory.children.length})
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenAddCategory(currentCategory.id)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#B8860B] hover:text-[#996515] transition-colors"
                        >
                          <Plus size={12} />
                          <span>Add Subcategory</span>
                        </button>
                      </div>

                      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                        {currentCategory.children.map((child) => (
                          <div
                            key={child.id}
                            onClick={() => selectCategory(child, path)}
                            className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-slate-50/60 p-3 hover:border-[#D4AF37] hover:bg-white hover:shadow-xs transition-all cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white border border-slate-200 text-slate-700 group-hover:bg-[#080C14] group-hover:text-[#F3CA52] group-hover:border-[#D4AF37]/40 transition-colors shadow-2xs">
                                <Folder size={16} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 group-hover:text-[#B8860B] transition-colors truncate">
                                  {child.name}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {child.children?.length ?? 0} sub • {child.items?.length ?? 0} dishes
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => onOpenEditCategory(child, e)}
                                className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 opacity-70 hover:opacity-100 hover:bg-slate-100 hover:text-slate-700 transition-all"
                                title="Edit subcategory"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => onDeleteCategory(child.id, child.name, e)}
                                className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 opacity-70 hover:opacity-100 hover:bg-rose-50 hover:text-rose-500 transition-all"
                                title="Delete subcategory"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 4. Dishes & Items List inside this Category */}
                  <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <UtensilsCrossed size={14} className="text-[#B8860B]" />
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                          Dishes in &ldquo;{currentCategory.name}&rdquo; ({activeDishes.length})
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 flex-1 max-w-xs justify-end">
                        <div className="relative w-full">
                          <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={dishSearch}
                            onChange={(e) => setDishSearch(e.target.value)}
                            placeholder="Search dishes here…"
                            className="h-8 w-full rounded-xl border border-slate-200 bg-slate-50 pl-7 pr-7 text-xs outline-none placeholder:text-slate-400 focus:border-[#B8860B] focus:bg-white"
                          />
                          {dishSearch && (
                            <button
                              type="button"
                              onClick={() => setDishSearch('')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={onOpenAddItem}
                          className="inline-flex h-8 items-center gap-1 rounded-xl bg-[#080C14] px-3 text-xs font-bold text-[#F3CA52] border border-[#D4AF37] hover:bg-[#101622] transition-all shrink-0"
                        >
                          <Plus size={13} className="text-[#F3CA52]" />
                          <span>Add Dish</span>
                        </button>
                      </div>
                    </div>

                    {/* Dishes Grid / Table */}
                    {activeDishes.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center space-y-2">
                        <UtensilsCrossed size={28} className="mx-auto text-slate-300" />
                        <p className="text-xs font-bold text-slate-700">No dishes in this category yet</p>
                        <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                          Click &ldquo;+ Add Dish&rdquo; to add Biriyanis, Curries, Appetizers, or Desserts directly to this category.
                        </p>
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={onOpenAddItem}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#080C14] px-4 py-2 text-xs font-bold text-[#F3CA52] border border-[#D4AF37] hover:bg-[#101622] transition-all shadow-xs"
                          >
                            <Plus size={13} className="text-[#F3CA52]" />
                            <span>Add First Dish</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-xs min-w-[540px]">
                          <thead className="bg-[#FAF9F6] border-b border-slate-200/80 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            <tr>
                              <th className="px-3.5 py-2.5 text-left w-12">#</th>
                              <th className="px-3.5 py-2.5 text-left">Dish / Item</th>
                              <th className="px-3.5 py-2.5 text-right w-32">Price (₹)</th>
                              <th className="px-3 py-2.5 text-center w-24">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {activeDishes.map((dish, dIdx) => (
                              <tr key={dish.id} className="hover:bg-slate-50/70 transition-colors">
                                <td className="px-3.5 py-2.5 font-mono text-slate-400">
                                  {dIdx + 1}
                                </td>
                                <td className="px-3.5 py-2.5">
                                  <div className="flex items-center gap-3">
                                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-2xs">
                                      {dish.imageUrl ? (
                                        <img
                                          src={toMediaUrl(dish.imageUrl)}
                                          alt={dish.name}
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        <div className="flex h-full w-full items-center justify-center text-slate-300">
                                          <UtensilsCrossed size={14} />
                                        </div>
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-bold text-slate-900 truncate">
                                        {dish.name}
                                      </p>
                                      {dish.description && (
                                        <p className="text-[11px] text-slate-400 truncate max-w-sm">
                                          {dish.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-800">
                                  {Number(dish.basePrice) > 0 ? formatInr(Number(dish.basePrice)) : '—'}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => onOpenEditItem(dish)}
                                      className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                                      title="Edit dish"
                                    >
                                      <Pencil size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void onDeleteItem(dish.id, dish.name)}
                                      className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                      title="Delete dish"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          CATEGORY CREATE / EDIT FORM DIALOG
          ════════════════════════════════════════════════════════════════ */}
      <FormDialog
        title={categoryEditId ? 'Edit Category' : 'Create New Category'}
        description={
          categoryEditId
            ? 'Update category title, description, or image'
            : categoryForm.parentId
            ? 'Add a subcategory under the selected parent'
            : 'Add a new top-level root category'
        }
        open={categoryModalOpen}
        onOpenChange={setCategoryModalOpen}
      >
        <div className="space-y-4">
          <FormField label="Category Name *">
            <Input
              value={categoryForm.name}
              onChange={(e) => setCategoryForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="e.g. Welcome Drinks, Malabar Biriyanis, Stage Decoration…"
              className="h-10 text-sm font-semibold rounded-xl"
            />
          </FormField>

          {!categoryEditId && (
            <FormField label="Parent Category">
              <SelectInput
                value={categoryForm.parentId}
                onChange={(e) => setCategoryForm((s) => ({ ...s, parentId: e.target.value }))}
                className="h-10 text-xs rounded-xl"
              >
                <option value="">No Parent (Top-level Root Category)</option>
                {flattenCategories(tree).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.path}
                  </option>
                ))}
              </SelectInput>
            </FormField>
          )}

          <FormField label="Description (Optional)">
            <Textarea
              value={categoryForm.description}
              onChange={(e) => setCategoryForm((s) => ({ ...s, description: e.target.value }))}
              placeholder="Brief description of dishes or items in this category…"
              className="text-xs rounded-xl"
              rows={2}
            />
          </FormField>

          <FormField label="Category Photo">
            <UploadBox
              previewUrl={categoryForm.imagePreview}
              onFile={(file) =>
                setCategoryForm((s) => ({
                  ...s,
                  imageFile: file,
                  imagePreview: URL.createObjectURL(file),
                }))
              }
              onClear={() =>
                setCategoryForm((s) => ({
                  ...s,
                  imageFile: null,
                  imagePreview: '',
                }))
              }
            />
          </FormField>

          <FormDialogFooter className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCategoryModalOpen(false)}
              disabled={savingCategory}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleCategorySubmit()}
              disabled={savingCategory || !categoryForm.name.trim()}
              className="bg-[#080C14] text-[#F3CA52] hover:bg-[#101622] border border-[#D4AF37]"
            >
              {savingCategory ? 'Saving…' : categoryEditId ? 'Save Changes' : 'Create Category'}
            </Button>
          </FormDialogFooter>
        </div>
      </FormDialog>

      {/* ════════════════════════════════════════════════════════════════
          DISH / ITEM CREATE / EDIT FORM DIALOG
          ════════════════════════════════════════════════════════════════ */}
      <FormDialog
        title={itemEditId ? 'Edit Dish' : 'Add Dish to Category'}
        description={
          currentCategory
            ? `Category: ${currentCategory.name}`
            : 'Enter dish specifications'
        }
        open={itemModalOpen}
        onOpenChange={setItemModalOpen}
      >
        <div className="space-y-4">
          <FormField label="Dish / Item Name *">
            <Input
              value={itemForm.name}
              onChange={(e) => setItemForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="e.g. Thalassery Mutton Dum Biriyani, Appam, Palada Payasam…"
              className="h-10 text-sm font-semibold rounded-xl"
            />
          </FormField>

          <FormField label="Base Rate (₹)">
            <Input
              type="number"
              min={0}
              value={itemForm.basePrice}
              onChange={(e) => setItemForm((s) => ({ ...s, basePrice: e.target.value }))}
              placeholder="0"
              className="h-10 text-sm font-bold rounded-xl"
            />
          </FormField>

          <FormField label="Description (Optional)">
            <Textarea
              value={itemForm.description}
              onChange={(e) => setItemForm((s) => ({ ...s, description: e.target.value }))}
              placeholder="Ingredients, spice level, preparation style…"
              className="text-xs rounded-xl"
              rows={2}
            />
          </FormField>

          <FormField label="Dish Photo">
            <UploadBox
              previewUrl={itemForm.imagePreview}
              onFile={(file) =>
                setItemForm((s) => ({
                  ...s,
                  imageFile: file,
                  imagePreview: URL.createObjectURL(file),
                }))
              }
              onClear={() =>
                setItemForm((s) => ({
                  ...s,
                  imageFile: null,
                  imagePreview: '',
                }))
              }
            />
          </FormField>

          <FormDialogFooter className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setItemModalOpen(false)}
              disabled={savingItem}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleItemSubmit()}
              disabled={savingItem || !itemForm.name.trim()}
              className="bg-[#080C14] text-[#F3CA52] hover:bg-[#101622] border border-[#D4AF37]"
            >
              {savingItem ? 'Saving…' : itemEditId ? 'Save Changes' : 'Create Dish'}
            </Button>
          </FormDialogFooter>
        </div>
      </FormDialog>

      {confirmModal}
    </PageShell>
  );
}

/* ════════════════════════════════════════════════════════════════
   RECURSIVE TREE NODE COMPONENT (LEFT PANEL)
   ════════════════════════════════════════════════════════════════ */
function TreeNode({
  node,
  depth,
  parentPathIds,
  activeId,
  expandedNodes,
  filterQuery,
  onToggleExpand,
  onSelect,
  onAddSubcategory,
  onEdit,
  onDelete,
}: {
  node: CategoryNode;
  depth: number;
  parentPathIds: string[];
  activeId?: string;
  expandedNodes: Set<string>;
  filterQuery: string;
  onToggleExpand: (id: string, e?: React.MouseEvent) => void;
  onSelect: (node: CategoryNode, parentPathIds: string[]) => void;
  onAddSubcategory: (parentId: string) => void;
  onEdit: (cat: CategoryNode, e: React.MouseEvent) => void;
  onDelete: (id: string, name: string, e: React.MouseEvent) => void;
}) {
  const isExpanded = expandedNodes.has(node.id);
  const isActive = activeId === node.id;
  const hasChildren = node.children && node.children.length > 0;
  const totalItems = countBranchItems(node);

  // If filtering tree, check if this node or any child matches
  if (filterQuery) {
    const matchesSelf = node.name.toLowerCase().includes(filterQuery);
    const matchesChild = nodeMatchesFilter(node, filterQuery);
    if (!matchesSelf && !matchesChild) return null;
  }

  const currentPathIds = [...parentPathIds, node.id];

  return (
    <div className="select-none">
      <div
        onClick={() => onSelect(node, parentPathIds)}
        style={{ paddingLeft: `${Math.max(depth * 14 + 6, 6)}px` }}
        className={`group relative flex items-center justify-between gap-1.5 rounded-xl py-1.5 pr-2 transition-all cursor-pointer ${
          isActive
            ? 'bg-[#080C14] text-[#F3CA52] border border-[#D4AF37]/50 shadow-xs'
            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        {/* Left: Chevron + Folder Icon + Name */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => onToggleExpand(node.id, e)}
              className={`grid h-5 w-5 place-items-center rounded hover:bg-white/10 transition-transform ${
                isActive ? 'text-[#F3CA52]' : 'text-slate-400'
              }`}
            >
              {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>
          ) : (
            <span className="w-5" />
          )}

          <div
            className={`grid h-5 w-5 shrink-0 place-items-center rounded ${
              isActive ? 'text-[#F3CA52]' : 'text-slate-400 group-hover:text-[#B8860B]'
            }`}
          >
            {hasChildren && isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />}
          </div>

          <span
            className={`truncate text-xs ${
              isActive ? 'font-black text-white' : 'font-semibold text-slate-800'
            }`}
          >
            {node.name}
          </span>
        </div>

        {/* Right: Badge count + Hover Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Item count badge (hidden when hovered to reveal actions) */}
          <span
            className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold font-mono transition-opacity ${
              isActive
                ? 'bg-[#F3CA52]/20 text-[#F3CA52]'
                : 'bg-slate-200/70 text-slate-500 group-hover:opacity-0 sm:group-hover:opacity-0'
            }`}
          >
            {totalItems}
          </span>

          {/* Quick Action Buttons (visible on hover or active) */}
          <div className="flex items-center gap-0.5 opacity-70 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddSubcategory(node.id);
              }}
              className={`grid h-5 w-5 place-items-center rounded hover:bg-amber-100 hover:text-amber-800 ${
                isActive ? 'text-[#F3CA52]' : 'text-slate-400'
              }`}
              title="Add subcategory"
            >
              <Plus size={11} />
            </button>
            <button
              type="button"
              onClick={(e) => onEdit(node, e)}
              className={`grid h-5 w-5 place-items-center rounded hover:bg-slate-200 hover:text-slate-800 ${
                isActive ? 'text-[#F3CA52]' : 'text-slate-400'
              }`}
              title="Edit category"
            >
              <Pencil size={11} />
            </button>
            <button
              type="button"
              onClick={(e) => onDelete(node.id, node.name, e)}
              className={`grid h-5 w-5 place-items-center rounded hover:bg-rose-100 hover:text-rose-600 ${
                isActive ? 'text-rose-300' : 'text-slate-400'
              }`}
              title="Delete category"
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>
      </div>

      {/* Children branches */}
      {hasChildren && isExpanded && (
        <div className="mt-0.5 space-y-0.5">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              parentPathIds={currentPathIds}
              activeId={activeId}
              expandedNodes={expandedNodes}
              filterQuery={filterQuery}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              onAddSubcategory={onAddSubcategory}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   UPLOAD BOX COMPONENT
   ════════════════════════════════════════════════════════════════ */
function UploadBox({
  previewUrl,
  onFile,
  onClear,
}: {
  previewUrl?: string;
  onFile: (file: File) => void;
  onClear: () => void;
}) {
  return (
    <div className="relative">
      <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-4 text-center hover:border-[#B8860B]/60 hover:bg-amber-50/20 transition-all">
        <input
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
          }}
        />

        {previewUrl ? (
          <div className="relative mx-auto h-28 w-36 overflow-hidden rounded-xl border border-slate-200 shadow-xs">
            <img
              src={toMediaUrl(previewUrl)}
              alt="preview"
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="space-y-1.5 text-slate-500 py-2">
            <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-white border border-slate-200 shadow-2xs text-[#B8860B]">
              <ImagePlus size={18} />
            </div>
            <p className="text-xs font-bold text-slate-700">Upload Photo</p>
            <p className="text-[10px] text-slate-400">PNG, JPG, WEBP up to 5MB</p>
          </div>
        )}
      </label>

      {previewUrl && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClear();
          }}
          className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-rose-500 text-white shadow hover:bg-rose-600 transition-colors"
          title="Remove photo"
        >
          <X size={12} />
        </button>
      )}
    </div>
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
      <label className="mb-1.5 block text-xs font-bold text-slate-700">{label}</label>
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

/* ════════════════════════════════════════════════════════════════
   TREE HELPER FUNCTIONS
   ════════════════════════════════════════════════════════════════ */
function countCatalogStats(tree: CategoryNode[]) {
  let totalCategories = 0;
  let totalItems = 0;

  const walk = (nodes: CategoryNode[]) => {
    for (const node of nodes) {
      totalCategories++;
      totalItems += node.items?.length ?? 0;
      if (node.children?.length) walk(node.children);
    }
  };

  walk(tree);
  return { totalCategories, totalItems };
}

function countBranchItems(node: CategoryNode): number {
  let count = node.items?.length ?? 0;
  if (node.children?.length) {
    for (const child of node.children) {
      count += countBranchItems(child);
    }
  }
  return count;
}

function nodeMatchesFilter(node: CategoryNode, query: string): boolean {
  if (node.name.toLowerCase().includes(query)) return true;
  if (node.children?.length) {
    return node.children.some((c) => nodeMatchesFilter(c, query));
  }
  return false;
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
      if (node.children?.length) {
        walk(node.children, path);
      }
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

      for (const item of node.items ?? []) {
        if (
          item.name.toLowerCase().includes(normalizedQuery) ||
          (item.description && item.description.toLowerCase().includes(normalizedQuery))
        ) {
          items.push({
            item,
            hierarchyPath,
            pathIds: nextPathIds,
          });
        }
      }

      if (node.children?.length) {
        walk(node.children, nextPathIds, nextPathNames);
      }
    }
  };

  walk(tree);
  return { categories, items };
}
