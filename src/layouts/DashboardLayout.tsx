import { Bell, LogOut, Search } from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { navItems, roleLabels } from "../utils/permissions";
import { clearCurrentUser, requireCurrentUser } from "../utils/auth";

function pageTitle(path: string) {
  const flat = navItems.flatMap((item) => item.children ?? [item]);
  return flat.find((item) => item.path === path)?.title ?? "首页总览";
}

export function DashboardLayout() {
  const user = requireCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();
  const visibleNav = navItems
    .filter((item) => item.roles.includes(user.role))
    .map((item) => ({ ...item, children: item.children?.filter((child) => child.roles.includes(user.role)) }))
    .filter((item) => item.path || (item.children && item.children.length > 0));

  return (
    <div className="app-shell flex">
      <aside className="glass-sidebar fixed left-0 top-0 flex h-screen w-72 flex-col p-5">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-900 text-lg font-black text-white">卡</div>
          <div>
            <p className="text-lg font-black text-ink">球星卡对账</p>
            <p className="text-xs font-bold text-slate-500">采购接单系统</p>
          </div>
        </div>
        <nav className="flex-1 space-y-2 overflow-y-auto pr-1">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            if (item.children?.length) {
              return (
                <div key={item.title} className="rounded-3xl bg-white/25 p-2">
                  <div className="mb-1 flex items-center gap-3 px-3 py-2 text-sm font-black text-slate-500">
                    {Icon && <Icon size={18} />}
                    {item.title}
                  </div>
                  <div className="space-y-1">
                    {item.children.map((child) => (
                      <NavLink
                        key={`${child.title}-${child.path}`}
                        to={child.path!}
                        end
                        className={({ isActive }) => `block rounded-2xl px-9 py-2.5 text-sm font-bold transition ${isActive ? "bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/10" : "text-slate-500 hover:bg-white/70 hover:text-ink"}`}
                      >
                        {child.title}
                      </NavLink>
                    ))}
                  </div>
                </div>
              );
            }
            return (
              <NavLink key={item.title} to={item.path!} end className={({ isActive }) => `flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-black transition ${isActive ? "bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/10" : "text-slate-500 hover:bg-white/70 hover:text-ink"}`}>
                {Icon && <Icon size={18} />}
                {item.title}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <div className="ml-72 min-h-screen flex-1">
        <header className="sticky top-0 z-30 flex h-24 items-center justify-between px-8 backdrop-blur-xl">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Dashboard</p>
            <h1 className="text-2xl font-black text-ink">{pageTitle(location.pathname)}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="soft-input flex h-12 w-80 items-center gap-3 px-4">
              <Search size={18} className="text-slate-400" />
              <input className="w-full bg-transparent text-sm outline-none" placeholder="搜索任务、运单号、买手..." />
            </div>
            <button className="ghost-btn grid h-12 w-12 place-items-center p-0" aria-label="消息提醒"><Bell size={19} /></button>
            <div className="rounded-2xl bg-white/80 px-4 py-2 text-sm font-bold shadow-sm">
              <span className="text-slate-400">{roleLabels[user.role]}</span>
              <span className="ml-2 text-ink">{user.displayName}</span>
            </div>
            <button
              className="ghost-btn flex h-12 items-center gap-2"
              onClick={() => {
                clearCurrentUser();
                navigate("/login", { replace: true });
              }}
            >
              <LogOut size={18} />退出
            </button>
          </div>
        </header>
        <main className="px-8 pb-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
