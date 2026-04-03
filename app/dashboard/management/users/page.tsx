'use client';

import { useState } from 'react';
import { useInvoiceData } from '@/context/InvoiceContext';
import { useConfirm } from '@/context/ConfirmationContext';
import { User } from '@/lib/types';
import { Users, Plus, Search, Edit, Trash2, CheckCircle, XCircle, Shield, Building2, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function UsersPage() {
  const { users, roles, allCompanies, addUser, updateUser, deleteUser } = useInvoiceData();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    roleId: '',
    companyId: '',
    status: 'active' as 'active' | 'disabled',
    avatar: '',
  });

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const getRole = (roleId: string) => roles.find(r => r.id === roleId);
  const getCompany = (companyId: string) => allCompanies.find(c => c.id === companyId);

  const openAdd = () => {
    setEditingUser(null);
    setForm({
      name: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      roleId: roles[0]?.id || '',
      companyId: allCompanies[0]?.id || '',
      status: 'active',
      avatar: '',
    });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setForm({
      name: user.name,
      username: user.username,
      email: user.email,
      roleId: user.roleId,
      companyId: user.companyId,
      status: user.status,
      avatar: user.avatar || '',
      password: '',
      confirmPassword: '',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!form.name.trim() || !form.username.trim() || !form.email.trim()) {
      setFormError('الاسم الكامل، اسم المستخدم، والبريد الإلكتروني مطلوبة.');
      return;
    }

    if (!editingUser && !form.password.trim()) {
      setFormError('كلمة المرور مطلوبة للمستخدمين الجدد.');
      return;
    }

    if (form.password.trim() && form.password !== form.confirmPassword) {
      setFormError('كلمات المرور غير متطابقة.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      username: form.username.trim(),
      email: form.email.trim(),
      roleId: form.roleId,
      companyId: form.companyId,
      status: form.status,
      avatar: form.avatar.trim() || undefined,
      ...(form.password.trim() ? { password: form.password } : {}),
    };

    const result = editingUser
      ? await updateUser(editingUser.id, payload)
      : await addUser({ ...payload, lastLogin: undefined });

    if (!result.success) {
      setFormError(result.error || 'Could not save user.');
      return;
    }

    setShowModal(false);
  };

  const confirm = useConfirm();

  const handleDelete = async (id: string) => {
    const result = await confirm({
      title: 'Delete User',
      description: 'Are you sure you want to delete this user? They will no longer be able to access the system.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive'
    });
    if (result) {
      const res = await deleteUser(id);
      if (!res.success) {
        setFormError(res.error || 'Could not delete user.');
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Users
          </h1>
          <p className="text-muted-foreground mt-1">Manage system users and their access</p>
        </div>
        <Button onClick={openAdd} className="gap-2 shadow-md">
          <Plus size={18} /> Add User
        </Button>
      </div>

      {/* Search */}
      <div className="relative w-full md:w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search users..."
          className="pl-9 h-11 bg-card border-border/50 shadow-sm"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Users', value: users.length, colorClass: 'text-foreground' },
          { label: 'Active', value: users.filter(u => u.status === 'active').length, colorClass: 'text-emerald-500' },
          { label: 'Disabled', value: users.filter(u => u.status === 'disabled').length, colorClass: 'text-amber-500' },
        ].map(stat => (
          <Card key={stat.label} className="p-6 border-border/50 shadow-sm bg-card">
            <div className={`text-4xl font-bold ${stat.colorClass}`}>{stat.value}</div>
            <div className="text-muted-foreground text-sm mt-1 font-medium">{stat.label}</div>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card className="border-border/50 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                {['User', 'Username', 'Email', 'Role', 'Company', 'Last Login', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-4 text-left text-sm font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map((user) => {
                const role = getRole(user.roleId);
                const company = getCompany(user.companyId);
                return (
                  <tr key={user.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center font-bold text-sm text-foreground">
                          {user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-semibold text-foreground">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground/80">{user.username}</td>
                    <td className="px-6 py-4 text-sm text-foreground/80">{user.email}</td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="gap-1.5 bg-muted text-foreground border-border/50">
                        <Shield size={12} className="text-muted-foreground" /> {role?.name || 'Unknown'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 text-sm text-foreground/80">
                        <Building2 size={13} className="text-muted-foreground" /> {company?.name || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                      {user.lastLogin ? (
                        <span className="flex items-center gap-1.5">
                          <Clock size={13} /> {new Date(user.lastLogin).toLocaleDateString()}
                        </span>
                      ) : 'Never'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={`gap-1 pr-2.5 ${user.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'}`}>
                        {user.status === 'active' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Button onClick={() => openEdit(user)} variant="ghost" size="icon" className="h-8 w-8 text-foreground hover:bg-muted">
                          <Edit size={16} />
                        </Button>
                        <Button onClick={() => handleDelete(user.id)} variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
              <Users className="h-12 w-12 mb-3 opacity-20" />
              <p>No users found</p>
            </div>
          )}
        </div>
      </Card>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">{editingUser ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2" dir="rtl">
              {formError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 text-right">
                  {formError}
                </div>
              )}
              {[
                { label: 'الاسم بالكامل', key: 'name', type: 'text', placeholder: 'مثال: محمد أحمد' },
                { label: 'اسم المستخدم', key: 'username', type: 'text', placeholder: 'مثال: mohamed.ahmed' },
                { label: 'البريد الإلكتروني', key: 'email', type: 'email', placeholder: 'example@company.com' },
                { label: 'رابط الصورة الشخصية (اختياري)', key: 'avatar', type: 'text', placeholder: 'https://example.com/photo.jpg' },
              ].map(field => (
                <div key={field.key} className="space-y-1.5 text-right">
                  <label className="text-sm font-semibold text-foreground/80">{field.label}</label>
                  {field.key === 'avatar' && form.avatar && (
                    <div className="flex justify-end mb-2">
                      <div className="h-12 w-12 rounded-full border border-border overflow-hidden bg-muted">
                        <img 
                          src={form.avatar} 
                          alt="Preview" 
                          className="h-full w-full object-cover"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      </div>
                    </div>
                  )}
                  <Input
                    type={field.type}
                    value={form[field.key as keyof typeof form]}
                    onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    required
                    className="bg-background text-right"
                  />
                </div>
              ))}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 text-right">
                  <label className="text-sm font-semibold text-foreground/80">كلمة المرور {editingUser ? '(اتركها فارغة للإبقاء على الحالية)' : '*'}</label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="أدخل كلمة المرور"
                    autoComplete="new-password"
                    className="bg-background text-right"
                  />
                </div>
                <div className="space-y-1.5 text-right">
                  <label className="text-sm font-semibold text-foreground/80">تأكيد كلمة المرور</label>
                  <Input
                    type="password"
                    value={form.confirmPassword}
                    onChange={e => setForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="أعد إدخال كلمة المرور"
                    autoComplete="new-password"
                    className="bg-background text-right"
                  />
                </div>
              </div>
              
              <div className="space-y-1.5 text-right">
                <label className="text-sm font-semibold text-foreground/80">الصلاحية (Role)</label>
                <select 
                  value={form.roleId} 
                  onChange={e => setForm(prev => ({ ...prev, roleId: e.target.value }))}
                  className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-right"
                >
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5 text-right">
                <label className="text-sm font-semibold text-foreground/80">الشركة</label>
                <select 
                  value={form.companyId} 
                  onChange={e => setForm(prev => ({ ...prev, companyId: e.target.value }))}
                  className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-right"
                >
                  {allCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5 text-right">
                <label className="text-sm font-semibold text-foreground/80">الحالة</label>
                <select 
                  value={form.status} 
                  onChange={e => setForm(prev => ({ ...prev, status: e.target.value as 'active' | 'disabled' }))}
                  className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-right"
                >
                  <option value="active">نشط</option>
                  <option value="disabled">معطل</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  إلغاء
                </Button>
                <Button type="submit" className="shadow-md">
                  {editingUser ? 'حفظ التعديلات' : 'إضافة مستخدم'}
                </Button>
              </div>
            </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
