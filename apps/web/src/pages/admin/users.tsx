import { ReactNode, useEffect, useMemo, useState } from 'react';
import type { MRT_ColumnDef } from 'material-react-table';
import { Edit3, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { PageShell } from '@/layouts/page-shell';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/common/data-table';
import { usersService, UserRow } from '@/features/users/users.service';
import { SectionHeader } from '@/components/common/section-header';
import { FormDialog, FormDialogFooter } from '@/components/common/form-dialog';
import { Input } from '@/components/ui/input';
import { SelectInput } from '@/components/ui/select-input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useConfirmModal } from '@/hooks/use-confirm-modal';

export function UsersPage() {
  const { confirm, confirmModal } = useConfirmModal();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'STAFF' as 'ADMIN' | 'STAFF',
    password: '',
    isActive: 'true',
  });
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  const refresh = () => void usersService.list().then((res) => setRows(res.data));

  useEffect(() => {
    refresh();
  }, []);

  const columns = useMemo<MRT_ColumnDef<UserRow>[]>(
    () => [
      { accessorKey: 'name', header: 'Name' },
      { accessorKey: 'email', header: 'Email' },
      { accessorKey: 'role', header: 'Role' },
      {
        accessorKey: 'isActive',
        header: 'Status',
        Cell: ({ row }) =>
          row.original.isActive ? (
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Active</span>
          ) : (
            <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">Inactive</span>
          ),
      },
      {
        id: 'actions',
        header: 'Actions',
        Cell: ({ row }) => {
          const user = row.original;
          return (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="h-8 px-2.5"
                onClick={() => {
                  setSelected(user);
                  setForm({
                    name: user.name,
                    email: user.email,
                    phone: '',
                    role: user.role,
                    password: '',
                    isActive: String(user.isActive),
                  });
                  setEditOpen(true);
                }}
              >
                <Edit3 size={14} />
              </Button>
              <Button variant="danger" className="h-8 px-2.5" onClick={() => void onDelete(user.id)}>
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
      await usersService.create({
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
        role: form.role,
      });
      toast.success('User created');
      setCreateOpen(false);
      setForm({ name: '', email: '', phone: '', role: 'STAFF', password: '', isActive: 'true' });
      refresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Failed to create user');
    }
  };

  const onUpdate = async () => {
    if (!selected) return;

    try {
      await usersService.update(selected.id, {
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        role: form.role,
        isActive: form.isActive === 'true',
      });
      toast.success('User updated');
      setEditOpen(false);
      refresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Failed to update user');
    }
  };

  const onDelete = async (id: string) => {
    const accepted = await confirm({
      title: 'Delete User',
      description: 'Are you sure you want to delete this user?',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!accepted) return;

    try {
      await usersService.remove(id);
      toast.success('User deleted');
      refresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Failed to delete user');
    }
  };

  return (
    <PageShell title="Users" subtitle="Manage staff accounts and permissions">
      <Card>
        <SectionHeader
          title="User Management"
          subtitle="Create, update and deactivate staff/admin accounts"
          actionLabel="Add User"
          actionIcon={<Plus size={16} className="mr-2" />}
          onAction={() => {
            setForm({ name: '', email: '', phone: '', role: 'STAFF', password: '', isActive: 'true' });
            setShowCreatePassword(false);
            setCreateOpen(true);
          }}
        />
        <DataTable columns={columns} data={rows} />
      </Card>

      <FormDialog
        title="Create User"
        description="Add a new staff or admin account"
        open={createOpen}
        onOpenChange={setCreateOpen}
      >
        <div className="space-y-3">
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
          </Field>
          <Field label="Email">
            <Input value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone">
              <Input
                value={form.phone}
                inputMode="numeric"
                maxLength={10}
                onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
              />
            </Field>
            <Field label="Role">
              <SelectInput
                value={form.role}
                onChange={(e) => setForm((s) => ({ ...s, role: e.target.value as 'ADMIN' | 'STAFF' }))}
              >
                <option value="STAFF">STAFF</option>
                <option value="ADMIN">ADMIN</option>
              </SelectInput>
            </Field>
          </div>
          <Field label="Password">
            <div className="relative">
              <Input
                type={showCreatePassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-700"
                onClick={() => setShowCreatePassword((prev) => !prev)}
                aria-label={showCreatePassword ? 'Hide password' : 'Show password'}
              >
                {showCreatePassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>
          <FormDialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void onCreate()}>Create</Button>
          </FormDialogFooter>
        </div>
      </FormDialog>

      <FormDialog
        title="Edit User"
        description="Update user information and status"
        open={editOpen}
        onOpenChange={setEditOpen}
      >
        <div className="space-y-3">
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
          </Field>
          <Field label="Email">
            <Input value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Role">
              <SelectInput
                value={form.role}
                onChange={(e) => setForm((s) => ({ ...s, role: e.target.value as 'ADMIN' | 'STAFF' }))}
              >
                <option value="STAFF">STAFF</option>
                <option value="ADMIN">ADMIN</option>
              </SelectInput>
            </Field>
            <Field label="Status">
              <SelectInput
                value={form.isActive}
                onChange={(e) => setForm((s) => ({ ...s, isActive: e.target.value }))}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </SelectInput>
            </Field>
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold">{label}</label>
      {children}
    </div>
  );
}
